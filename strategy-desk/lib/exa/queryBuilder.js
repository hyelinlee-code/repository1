import { COHORTS_BY_ID } from "../config/vendors.js";
import { domainsForTiers } from "../config/sources.js";
import { STRATEGIC_LENS, CORE_QUESTION } from "../config/topics.js";

/**
 * Turns a brief request into a set of Exa search payloads.
 *
 * The sweep is deliberately split by *source tier* rather than fired as one
 * broad query, because the tiers want different things from Exa:
 *
 *   Pass A — vendor primary. `includeDomains` pinned to the cohort's own
 *            newsrooms, no category filter, livecrawl fallback. This is where
 *            changelogs and pricing pages live, and they are rarely "news".
 *   Pass B — business press. `category: "news"`, pinned to Tier 4, vendor names
 *            in the query because the domain no longer identifies the subject.
 *   Pass C — filings. Only for pricing and distribution topics, where the
 *            disclosed number is the point.
 *   Pass D — independent analysis. Tier 5, for normalized benchmarks.
 *
 * Each pass carries a `priority`; when the search budget is smaller than the
 * candidate set, low-priority passes are dropped rather than every pass being
 * starved of results.
 */

const PASS_KINDS = {
  vendorPrimary: { tiers: ["vendor-primary"], priority: 1.0, label: "Vendor primary" },
  filings: { tiers: ["filings"], priority: 0.8, label: "Filings" },
  press: { tiers: ["business-press"], priority: 0.7, label: "Business press" },
  analysis: { tiers: ["analysis"], priority: 0.45, label: "Independent analysis" },
};

/** Keep queries readable and well under Exa's length ceiling. */
function vendorNameList(vendors, max = 6) {
  const names = vendors.map((v) => v.name);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")}, and ${names.length - max} peers`;
}

function contentsBlock(topic, { livecrawl = "fallback", maxCharacters = 1200 } = {}) {
  return {
    // Enough text to score against, not so much that we pay to ship an essay.
    text: { maxCharacters, includeHtmlTags: false },
    // Highlights give the brief its evidence quotes, pulled against the lens.
    highlights: {
      query: topic.lens,
      numSentences: 2,
      highlightsPerUrl: 2,
    },
    // The summary prompt is where the strategy framing happens: Exa returns a
    // "what changed and does it move a number" read, not a generic abstract.
    summary: { query: topic.summaryPrompt },
    livecrawl,
  };
}

/**
 * @returns {Array<{id, kind, label, topicId, cohortId, priority, payload}>}
 */
export function buildSearchPasses({ topics, cohorts, window, resultsPerPass = 8 }) {
  const passes = [];
  const dateFilters = {
    startPublishedDate: window.graceStartISO ?? window.startISO,
    endPublishedDate: window.endISO,
  };

  for (const topic of topics) {
    for (const cohortId of cohorts) {
      const cohort = COHORTS_BY_ID[cohortId];
      if (!cohort) continue;
      const cohortVendors = cohort.vendors;
      const cohortDomains = [...new Set(cohortVendors.flatMap((v) => v.domains))].map(
        (d) => d.split("/")[0],
      );

      // Pass A — the vendor's own record of what it did.
      passes.push({
        id: `${topic.id}::${cohort.id}::vendor-primary`,
        kind: "vendorPrimary",
        label: `${cohort.label} — ${topic.short} (vendor primary)`,
        topicId: topic.id,
        cohortId: cohort.id,
        tierId: "vendor-primary",
        priority: PASS_KINDS.vendorPrimary.priority,
        payload: {
          query: `${vendorNameList(cohortVendors)}: ${topic.queryTerms[0]}`,
          type: "auto",
          numResults: resultsPerPass,
          includeDomains: cohortDomains,
          ...dateFilters,
          contents: contentsBlock(topic, {
            // Pricing pages change silently; never trust a cached copy of one.
            livecrawl: topic.id === "pricing-packaging" ? "always" : "fallback",
          }),
        },
      });

      // Pass B — secondhand reporting, which is where private-company deals and
      // named customer wins actually surface.
      passes.push({
        id: `${topic.id}::${cohort.id}::press`,
        kind: "press",
        label: `${cohort.label} — ${topic.short} (press)`,
        topicId: topic.id,
        cohortId: cohort.id,
        tierId: "business-press",
        priority:
          PASS_KINDS.press.priority +
          (topic.id === "distribution-capital" ? 0.25 : 0),
        payload: {
          query: `${topic.queryTerms[Math.min(1, topic.queryTerms.length - 1)]} at ${vendorNameList(cohortVendors, 4)}`,
          type: "auto",
          category: "news",
          numResults: resultsPerPass,
          includeDomains: domainsForTiers(["business-press"]),
          ...dateFilters,
          contents: contentsBlock(topic, { maxCharacters: 1000 }),
        },
      });
    }

    // Pass C — filings, only where a disclosed number is the whole signal.
    if (topic.id === "pricing-packaging" || topic.id === "distribution-capital") {
      passes.push({
        id: `${topic.id}::all::filings`,
        kind: "filings",
        label: `${topic.short} — filings and earnings`,
        topicId: topic.id,
        cohortId: null,
        tierId: "filings",
        priority: PASS_KINDS.filings.priority,
        payload: {
          query: `${topic.queryTerms[0]} disclosed in an earnings release or regulatory filing`,
          type: "auto",
          numResults: Math.max(4, Math.round(resultsPerPass * 0.75)),
          includeDomains: domainsForTiers(["filings"]),
          ...dateFilters,
          contents: contentsBlock(topic, { maxCharacters: 1400 }),
        },
      });
    }

    // Pass D — independent analysis, for the numbers nobody self-reports.
    passes.push({
      id: `${topic.id}::all::analysis`,
      kind: "analysis",
      label: `${topic.short} — independent analysis`,
      topicId: topic.id,
      cohortId: null,
      tierId: "analysis",
      priority: PASS_KINDS.analysis.priority,
      payload: {
        query: `Independent analysis of ${topic.queryTerms[0]}`,
        type: "auto",
        numResults: Math.max(3, Math.round(resultsPerPass * 0.5)),
        includeDomains: domainsForTiers(["analysis"]),
        ...dateFilters,
        contents: contentsBlock(topic, { maxCharacters: 1400 }),
      },
    });
  }

  return passes;
}

/**
 * Trim the candidate passes to the search budget, keeping the highest-priority
 * ones but guaranteeing every selected topic keeps at least one pass — a brief
 * that silently drops a whole topic is worse than a thin one.
 */
export function allocateBudget(passes, budget) {
  if (passes.length <= budget) return passes;

  const byPriority = [...passes].sort((a, b) => b.priority - a.priority);
  const kept = [];
  const seenTopics = new Set();

  // First, one guaranteed pass per topic.
  for (const pass of byPriority) {
    if (!seenTopics.has(pass.topicId)) {
      kept.push(pass);
      seenTopics.add(pass.topicId);
    }
  }
  // Then fill the remaining budget by priority.
  for (const pass of byPriority) {
    if (kept.length >= budget) break;
    if (!kept.includes(pass)) kept.push(pass);
  }

  return kept.slice(0, budget);
}

/**
 * The `/answer` payload behind the editor's note. Exa does the retrieval and
 * the synthesis, and returns citations we render as footnotes.
 */
export function buildAnswerPayload({ topics, vendors, window, items }) {
  const headlines = items
    .slice(0, 12)
    .map((item, i) => `${i + 1}. ${item.title} (${item.vendorName ?? item.domain})`)
    .join("\n");

  return {
    query: [
      `Strategic lens: ${STRATEGIC_LENS}`,
      `Core question: ${CORE_QUESTION}`,
      `Window: ${window.startISO} to ${window.endISO}.`,
      `Topics in scope: ${topics.map((t) => t.label).join(", ")}.`,
      `Vendors in scope: ${vendors.slice(0, 20).map((v) => v.name).join(", ")}.`,
      headlines ? `Developments already surfaced:\n${headlines}` : "",
      "Write three to four sentences for a corporate strategy team. Say which single development most changes a strategic assumption and name the assumption. Do not recap the news. If nothing in the window rises to that bar, say so plainly.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    text: true,
  };
}

/**
 * The `/contents` payload used to re-read pricing pages live. Cached pricing is
 * the one thing in this brief that is actively misleading when stale.
 */
export function buildPricingContentsPayload(urls) {
  return {
    urls: urls.slice(0, 10),
    livecrawl: "always",
    text: { maxCharacters: 2000 },
    summary: {
      query:
        "State the pricing meter and any list price on this page: seat, platform fee, credit, token, conversation, resolution, or outcome. Quote the figures exactly. If no price is shown, say the page does not disclose a price.",
    },
  };
}
