import { normalizeResult, dedupe, applyInclusionStandard } from "../brief/score.js";
import { groupForRender, rollupByCohort } from "../brief/generate.js";
import { TOPICS_BY_ID } from "../config/topics.js";

/**
 * Seeded demo brief.
 *
 * The app has to be demoable with no API key — on a laptop at an interview, or
 * in CI. These fixtures are Exa-*shaped*, so they run through the identical
 * normalize -> score -> dedupe -> inclusion-standard path as live results.
 * Only the transport is stubbed; none of the ranking logic is.
 *
 * IMPORTANT: this is illustrative copy, not reporting. Every item is stamped
 * `isSample: true` and the UI labels the whole brief as a sample. Nothing here
 * should be quoted as a real vendor development.
 */

const SAMPLE_RESULTS = [
  {
    topicId: "pricing-packaging",
    hoursAgo: 5,
    url: "https://openai.com/api/pricing/",
    title: "Sample: agent platform moves to a per-resolution meter alongside seats",
    author: null,
    score: 0.91,
    summary:
      "Illustrative example. The vendor introduces a per-resolution charge for its enterprise agent tier, keeping a seat-based platform fee underneath it. List price is shown per resolved conversation, with a monthly credit pool included in the platform fee.",
    highlights: [
      "Pricing moves from a seat-only meter to a platform fee plus per-resolution consumption.",
      "A monthly credit pool is bundled into the platform fee, with overage billed per resolution.",
    ],
  },
  {
    topicId: "pricing-packaging",
    hoursAgo: 20,
    url: "https://www.reuters.com/technology/",
    title: "Sample: enterprise buyers push back on token-metered agent pricing",
    author: "Sample Wire Report",
    score: 0.78,
    summary:
      "Illustrative example. Procurement teams report difficulty forecasting spend under token-based meters and are asking vendors for outcome-linked floors and ceilings. Two vendors are said to be piloting per-resolution pricing with a capped monthly commit.",
    highlights: [
      "Buyers are asking for spend predictability, not the lowest unit price.",
      "Capped commits with outcome floors are emerging as the compromise structure.",
    ],
  },
  {
    topicId: "context-control-plane",
    hoursAgo: 9,
    url: "https://www.microsoft.com/en-us/security/blog/",
    title: "Sample: agent registry and delegated-authority controls reach general availability",
    score: 0.88,
    summary:
      "Illustrative example. An agent registry, identity for non-human actors, and a policy runtime reach general availability, giving administrators a single pane of glass over which agents may act on which systems and under whose authority.",
    highlights: [
      "Every agent gets a first-class identity with scoped, revocable delegated authority.",
      "Policy is enforced at runtime rather than configured per application.",
    ],
  },
  {
    topicId: "context-control-plane",
    hoursAgo: 30,
    url: "https://www.databricks.com/blog",
    title: "Sample: semantic layer opens to third-party agents through a governed gateway",
    score: 0.83,
    summary:
      "Illustrative example. The vendor exposes its governed semantic layer to external agents via a gateway that enforces row-level policy at query time, positioning the data platform as the context plane beneath any agent runtime.",
    highlights: [
      "Third-party agents can query governed metrics without a data copy.",
      "Row-level policy is enforced at the gateway, not in the calling agent.",
    ],
  },
  {
    topicId: "product-innovation",
    hoursAgo: 14,
    url: "https://www.salesforce.com/news/",
    title: "Sample: vertical service agent ships with end-to-end case resolution",
    score: 0.86,
    summary:
      "Illustrative example. A vertical agent for customer service moves from drafting suggested replies to executing refunds, order changes, and entitlement checks end to end, with a human approval step configurable per action class.",
    highlights: [
      "The agent executes transactions rather than only drafting responses.",
      "Approval thresholds are set per action class, not per user.",
    ],
  },
  {
    topicId: "product-innovation",
    hoursAgo: 26,
    url: "https://www.anthropic.com/news",
    title: "Sample: model release adds long-horizon tool use for enterprise workflows",
    score: 0.8,
    summary:
      "Illustrative example. A model update targets long-horizon tool use, sustaining multi-step workflows across systems of record. The vendor publishes an evaluation suite for multi-hour task completion alongside the release.",
    highlights: [
      "Sustained multi-step execution across systems of record is the headline claim.",
      "An accompanying evaluation suite measures multi-hour task completion.",
    ],
  },
  {
    topicId: "standards-ecosystem",
    hoursAgo: 18,
    url: "https://cloud.google.com/blog/",
    title: "Sample: hyperscaler ships a reference implementation of an agent interoperability protocol",
    score: 0.79,
    summary:
      "Illustrative example. Rather than announcing intent, the vendor publishes a working reference implementation and names launch partners, moving the protocol from specification into shipped code with model-agnostic routing behind it.",
    highlights: [
      "A reference implementation ships with named partner adopters.",
      "Routing is model-agnostic, decoupling the control plane from a single lab.",
    ],
  },
  {
    topicId: "distribution-capital",
    hoursAgo: 11,
    url: "https://www.theinformation.com/",
    title: "Sample: AI-native challenger displaces an incumbent at a named enterprise account",
    author: "Sample Trade Report",
    score: 0.84,
    summary:
      "Illustrative example. A large enterprise replaces an incumbent service desk deployment with an AI-native vendor after a resolution-rate pilot. The contract is reported as outcome-priced with a floor on deflection rate.",
    highlights: [
      "The pilot was judged on resolution rate, not on seat count or feature parity.",
      "The resulting contract is outcome-priced with a deflection floor.",
    ],
  },
  {
    topicId: "distribution-capital",
    hoursAgo: 34,
    url: "https://www.crowdstrike.com/press-releases/",
    title: "Sample: security vendor acquires an agent-observability startup",
    score: 0.82,
    summary:
      "Illustrative example. The acquisition adds runtime tracing and evaluation for agent actions, extending the acquirer from endpoint telemetry into agent behaviour and strengthening its claim on the enterprise control point.",
    highlights: [
      "The deal extends telemetry coverage from endpoints to agent actions.",
      "Deal value was disclosed alongside the announcement.",
    ],
  },
  {
    topicId: "product-innovation",
    hoursAgo: 40,
    url: "https://www.atlassian.com/blog",
    title: "Sample: incremental changelog update to an existing automation feature",
    score: 0.52,
    // Deliberately below the bar. Note the wording avoids the detectors' own
    // vocabulary: describing an item as having "no pricing change" would trip
    // the pricing detector, which is exactly the lexical limitation the README
    // documents.
    summary:
      "Illustrative example. A minor changelog entry adjusting an existing automation rule builder. Nothing here moves a strategic assumption; it is included to show what the inclusion standard filters out.",
    highlights: ["A minor usability adjustment to an existing rule builder."],
  },
];

function isoHoursAgo(end, hours) {
  return new Date(new Date(end).getTime() - hours * 3_600_000).toISOString();
}

export function buildDemoBrief({ meta, topics, vendors, window }) {
  const selectedTopicIds = new Set(topics.map((t) => t.id));
  const selectedCohortIds = new Set(meta.cohorts.map((c) => c.id));

  const normalized = SAMPLE_RESULTS.filter((sample) => selectedTopicIds.has(sample.topicId))
    // Respect the chosen window: a 1-day sweep should not show a 40-hour-old item.
    .filter((sample) => sample.hoursAgo <= window.spanDays * 24 + 6)
    .map((sample) => {
      const topic = TOPICS_BY_ID[sample.topicId];
      const item = normalizeResult(
        {
          url: sample.url,
          title: sample.title,
          author: sample.author ?? null,
          score: sample.score,
          summary: sample.summary,
          highlights: sample.highlights,
          publishedDate: isoHoursAgo(window.endISO, sample.hoursAgo),
        },
        { topic, pass: { id: `demo::${sample.topicId}`, label: "Seeded sample" }, window },
      );
      item.isSample = true;
      return item;
    })
    // Cohort filtering happens after attribution, exactly as it does live.
    .filter((item) => !item.cohortId || selectedCohortIds.has(item.cohortId));

  const deduped = dedupe(normalized);
  const { lead, watch } = applyInclusionStandard(deduped);

  return {
    meta,
    editorNote: {
      text:
        "Sample editor's note. In a live run this paragraph comes from Exa's /answer endpoint, which retrieves and synthesises across the window and returns citations. It names the single development that most changes a strategic assumption — here, the move from seat-based to per-resolution pricing, which puts pressure on any plan that models revenue per seat rather than per resolved outcome.",
      citations: lead.slice(0, 3).map((item) => ({
        url: item.url,
        title: item.title,
        publishedDate: item.publishedDate,
      })),
      isSample: true,
    },
    retrieval: { attempted: 0, failed: 0, succeeded: 0 },
    retrievalFailed: false,
    sections: groupForRender(lead, topics),
    cohortRollup: rollupByCohort(lead),
    watch,
    counts: {
      retrieved: normalized.length,
      afterWindow: normalized.length,
      afterDedupe: deduped.length,
      lead: lead.length,
      watch: watch.length,
    },
    exa: {
      calls: 0,
      byEndpoint: {},
      totalResults: 0,
      totalCostUsd: 0,
      elapsedMs: 0,
      failures: 0,
      requests: [],
      passesPlanned: 0,
      passesRun: 0,
      mode: "demo",
    },
    warnings: [],
    demo: true,
    demoReason:
      "EXA_API_KEY is not set, so this brief is seeded sample content rendered through the real ranking pipeline. Set the key to run a live sweep.",
    vendorsConsidered: vendors.length,
  };
}
