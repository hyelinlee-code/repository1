import { exaSearch, exaAnswer, exaContents, mapWithConcurrency, ExaRunLog, hasExaKey } from "../exa/client.js";
import {
  buildSearchPasses,
  allocateBudget,
  buildAnswerPayload,
  buildPricingContentsPayload,
} from "../exa/queryBuilder.js";
import { resolveWindow, withPublishGrace } from "./window.js";
import { normalizeResult, dedupe, applyInclusionStandard } from "./score.js";
import { resolveTopics, TOPICS, STRATEGIC_LENS, SECTION_PURPOSE, CORE_QUESTION } from "../config/topics.js";
import { COHORTS, COHORTS_BY_ID, resolveVendors, ALL_VENDORS } from "../config/vendors.js";
import { buildDemoBrief } from "../demo/fixtures.js";

const DEFAULTS = {
  searchBudget: 16,
  resultsPerPass: 8,
  concurrency: 4,
  maxLead: 24,
};

export function isDemoMode() {
  return process.env.DEMO_MODE === "1" || !hasExaKey();
}

/**
 * Generate a vendor brief.
 *
 * Pipeline: resolve window -> build tiered Exa passes -> fan out under a
 * concurrency gate -> normalize and score -> de-duplicate -> apply the
 * inclusion standard -> livecrawl pricing pages -> synthesize the editor's
 * note with Exa `/answer` -> group for rendering.
 */
export async function generateBrief(request = {}) {
  const {
    preset = "1d",
    days,
    from,
    to,
    tzOffsetMinutes = 0,
    topicIds,
    cohortIds,
    vendorIds,
    searchBudget = DEFAULTS.searchBudget,
    resultsPerPass = DEFAULTS.resultsPerPass,
    includeEditorNote = true,
    now = new Date(),
  } = request;

  const window = withPublishGrace(
    resolveWindow({ preset, days, from, to, tzOffsetMinutes, now }),
  );
  const topics = resolveTopics(topicIds);
  const selectedCohortIds =
    cohortIds && cohortIds.length > 0 ? cohortIds : COHORTS.map((c) => c.id);
  const vendors = vendorIds && vendorIds.length > 0
    ? resolveVendors(vendorIds)
    : ALL_VENDORS.filter((v) => selectedCohortIds.includes(v.cohortId));

  const meta = {
    generatedAt: new Date(now).toISOString(),
    window: {
      label: window.label,
      detail: window.detail,
      startISO: window.startISO,
      endISO: window.endISO,
      spanDays: window.spanDays,
      presetId: window.presetId,
    },
    topics: topics.map((t) => ({ id: t.id, label: t.label, lens: t.lens })),
    cohorts: selectedCohortIds
      .map((id) => COHORTS_BY_ID[id])
      .filter(Boolean)
      .map((c) => ({ id: c.id, label: c.label })),
    vendorCount: vendors.length,
    purpose: SECTION_PURPOSE,
    coreQuestion: CORE_QUESTION,
    lens: STRATEGIC_LENS,
  };

  if (isDemoMode()) {
    return buildDemoBrief({ meta, topics, vendors, window });
  }

  const log = new ExaRunLog();
  const candidatePasses = buildSearchPasses({
    topics,
    cohorts: selectedCohortIds,
    window,
    resultsPerPass,
  });
  const passes = allocateBudget(candidatePasses, searchBudget);

  // --- Fan out ------------------------------------------------------------
  const searchResults = await mapWithConcurrency(
    passes,
    DEFAULTS.concurrency,
    async (pass) => {
      const response = await exaSearch(pass.payload, { label: pass.label, log });
      return { pass, response };
    },
  );

  const topicsById = Object.fromEntries(topics.map((t) => [t.id, t]));
  const rawItems = [];
  const passErrors = [];
  let failedPasses = 0;

  for (const entry of searchResults) {
    if (!entry || entry.error) {
      if (entry?.error) {
        failedPasses += 1;
        passErrors.push({
          pass: entry.item?.label ?? "unknown pass",
          message: entry.error.message ?? String(entry.error),
        });
      }
      continue;
    }
    const { pass, response } = entry;
    const topic = topicsById[pass.topicId] ?? TOPICS[0];
    for (const result of response?.results ?? []) {
      if (!result?.url) continue;
      rawItems.push(normalizeResult(result, { topic, pass, window }));
    }
  }

  // Everything reached the API through a graced start date; enforce the honest
  // boundary now, keeping only same-day-stamped items that fall just outside.
  const windowStart = new Date(window.startISO).getTime();
  const inWindow = rawItems.filter((item) => {
    if (!item.publishedDate) return true;
    const published = new Date(item.publishedDate).getTime();
    if (Number.isNaN(published)) return true;
    // Day-granularity timestamps: keep anything stamped on the start date.
    return published >= windowStart - 12 * 3_600_000;
  });

  const deduped = dedupe(inWindow);
  const { lead, watch } = applyInclusionStandard(deduped, { maxLead: DEFAULTS.maxLead });

  // --- Livecrawl pricing pages -------------------------------------------
  // A cached pricing page is the one artefact in this brief that can be
  // confidently wrong, so pricing items get re-read at generation time.
  const pricingUrls = lead
    .filter((item) => item.topicId === "pricing-packaging" && item.tier.number === 1)
    .slice(0, 6)
    .map((item) => item.url);

  if (pricingUrls.length > 0) {
    try {
      const fresh = await exaContents(buildPricingContentsPayload(pricingUrls), {
        label: "Pricing pages — livecrawl",
        log,
      });
      const bySource = new Map((fresh?.results ?? []).map((r) => [r.url, r]));
      for (const item of lead) {
        const refreshed = bySource.get(item.url);
        if (refreshed?.summary) {
          item.livePricingRead = refreshed.summary.trim();
          item.livecrawledAt = new Date().toISOString();
        }
      }
    } catch (error) {
      passErrors.push({ pass: "Pricing livecrawl", message: error.message });
    }
  }

  // --- Editor's note ------------------------------------------------------
  let editorNote = null;
  if (includeEditorNote && lead.length > 0) {
    try {
      const answer = await exaAnswer(
        buildAnswerPayload({ topics, vendors, window, items: lead }),
        { label: "Editor's note", log },
      );
      editorNote = {
        text: typeof answer?.answer === "string" ? answer.answer.trim() : "",
        citations: (answer?.citations ?? []).slice(0, 6).map((c) => ({
          url: c.url,
          title: c.title ?? c.url,
          publishedDate: c.publishedDate ?? null,
        })),
      };
    } catch (error) {
      passErrors.push({ pass: "Editor's note", message: error.message });
    }
  }

  // An empty brief means two very different things depending on why it is
  // empty. "No vendor moved" is a finding; "every search failed" is an outage,
  // and reporting the second as the first is how a strategy team gets told
  // nothing happened on the day something did.
  const retrievalFailed = passes.length > 0 && failedPasses === passes.length;

  return {
    meta,
    editorNote,
    retrieval: {
      attempted: passes.length,
      failed: failedPasses,
      succeeded: passes.length - failedPasses,
    },
    retrievalFailed,
    sections: groupForRender(lead, topics),
    cohortRollup: rollupByCohort(lead),
    watch: watch.slice(0, 20),
    counts: {
      retrieved: rawItems.length,
      afterWindow: inWindow.length,
      afterDedupe: deduped.length,
      lead: lead.length,
      watch: watch.length,
    },
    exa: {
      ...log.summary(),
      passesPlanned: candidatePasses.length,
      passesRun: passes.length,
      mode: "live",
    },
    warnings: passErrors,
    demo: false,
  };
}

/** Group the lead items by topic, in the spec's topic order. */
export function groupForRender(items, topics) {
  return topics
    .map((topic) => ({
      topic: {
        id: topic.id,
        label: topic.label,
        short: topic.short,
        lens: topic.lens,
        accent: topic.accent,
      },
      items: items.filter((item) => item.topicId === topic.id),
    }))
    .filter((section) => section.items.length > 0);
}

/** A one-line-per-cohort tally, for the "who moved" strip at the top. */
export function rollupByCohort(items) {
  return COHORTS.map((cohort) => {
    const cohortItems = items.filter((item) => item.cohortId === cohort.id);
    return {
      id: cohort.id,
      label: cohort.label,
      count: cohortItems.length,
      topVendors: [
        ...new Set(cohortItems.map((item) => item.vendorName).filter(Boolean)),
      ].slice(0, 4),
    };
  }).filter((row) => row.count > 0);
}
