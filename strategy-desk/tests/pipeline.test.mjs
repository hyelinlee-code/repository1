import test from "node:test";
import assert from "node:assert/strict";

import { resolveWindow, withPublishGrace } from "../lib/brief/window.js";
import { detectSignals } from "../lib/config/signals.js";
import { classifySource } from "../lib/config/sources.js";
import { normalizeResult, dedupe, applyInclusionStandard, attributeVendor } from "../lib/brief/score.js";
import { buildSearchPasses, allocateBudget } from "../lib/exa/queryBuilder.js";
import { briefToMarkdown } from "../lib/brief/markdown.js";
import { TOPICS, TOPICS_BY_ID } from "../lib/config/topics.js";
import { generateBrief } from "../lib/brief/generate.js";

const MONDAY_2PM_UTC = new Date("2026-08-24T14:00:00Z");
const PACIFIC_OFFSET = 420; // UTC-7, as getTimezoneOffset() reports it

function makeWindow(preset = "2d") {
  return withPublishGrace(
    resolveWindow({ preset, now: MONDAY_2PM_UTC, tzOffsetMinutes: PACIFIC_OFFSET }),
  );
}

// --- Date windows --------------------------------------------------------

test("day presets produce the requested span", () => {
  for (const [preset, days] of [["1d", 1], ["2d", 2], ["7d", 7], ["14d", 14]]) {
    const window = resolveWindow({ preset, now: MONDAY_2PM_UTC });
    assert.equal(window.spanDays, days, `${preset} should span ${days} days`);
    assert.equal(window.endISO, MONDAY_2PM_UTC.toISOString());
  }
});

test("'today' starts at the viewer's local midnight, not the server's", () => {
  const window = resolveWindow({
    preset: "today",
    now: MONDAY_2PM_UTC,
    tzOffsetMinutes: PACIFIC_OFFSET,
  });
  // Midnight Pacific on Aug 24 is 07:00Z the same day.
  assert.equal(window.startISO, "2026-08-24T07:00:00.000Z");
});

test("weekend catch-up on a Monday reaches back to Saturday 00:00 local", () => {
  const window = resolveWindow({
    preset: "weekend",
    now: MONDAY_2PM_UTC,
    tzOffsetMinutes: PACIFIC_OFFSET,
  });
  assert.equal(window.startISO, "2026-08-22T07:00:00.000Z");
});

test("a malformed custom range falls back instead of throwing", () => {
  const window = resolveWindow({ preset: "custom", from: "not-a-date", now: MONDAY_2PM_UTC });
  assert.equal(window.spanDays, 1);
});

test("a reversed custom range is corrected rather than inverted", () => {
  const window = resolveWindow({
    preset: "custom",
    from: "2026-08-20T00:00:00Z",
    to: "2026-08-10T00:00:00Z",
    now: MONDAY_2PM_UTC,
  });
  assert.ok(window.start < window.end);
});

test("the publish grace band only widens the API floor, never the honest one", () => {
  const window = makeWindow("1d");
  assert.ok(new Date(window.graceStartISO) < new Date(window.startISO));
  assert.equal(window.startISO, resolveWindow({ preset: "1d", now: MONDAY_2PM_UTC }).startISO);
});

// --- Inclusion standard --------------------------------------------------

test("buyer-side language is a customer win; vendor-side launch language is not", () => {
  const win = detectSignals({
    title: "Global bank standardized on the platform",
    summary: "The bank switched from its incumbent suite.",
  });
  assert.ok(win.ids.includes("customer-win"));

  const launch = detectSignals({ title: "Vendor rolls out an agent registry", summary: "" });
  assert.ok(!launch.ids.includes("customer-win"));
});

test("pricing meters and disclosed figures are detected", () => {
  const signals = detectSignals({
    title: "Pricing moves to $0.40 per resolution",
    summary: "The vendor reported $120 million in ARR, up 45%.",
  });
  assert.ok(signals.ids.includes("pricing-change"));
  assert.ok(signals.ids.includes("disclosed-metric"));
  assert.equal(signals.needsVerification, true);
});

test("an item with no signal earns nothing", () => {
  const signals = detectSignals({ title: "A small usability tweak", summary: "Nothing else." });
  assert.deepEqual(signals.ids, []);
  assert.equal(signals.strength, 0);
});

// --- Source hierarchy ----------------------------------------------------

test("URLs classify into the right tier, including subdomains", () => {
  assert.equal(classifySource("https://openai.com/index/foo").tier, 1);
  assert.equal(classifySource("https://blog.openai.com/foo").tier, 1);
  assert.equal(classifySource("https://www.sec.gov/filing").tier, 2);
  assert.equal(classifySource("https://x.com/someone/status/1").tier, 3);
  assert.equal(classifySource("https://www.reuters.com/tech/x").tier, 4);
  assert.equal(classifySource("https://stratechery.com/2026/x").tier, 5);
  assert.equal(classifySource("https://random-blog.example/x").tier, 6);
});

test("official-account sources are always flagged for verification", () => {
  const item = normalizeResult(
    { url: "https://x.com/vendor/status/1", title: "We shipped it", publishedDate: "2026-08-24T10:00:00Z" },
    { topic: TOPICS[0], pass: null, window: makeWindow() },
  );
  assert.equal(item.tier.number, 3);
  assert.equal(item.needsVerification, true);
});

// --- Attribution and ranking --------------------------------------------

test("vendors are attributed by domain, then by name mention", () => {
  assert.equal(attributeVendor({ url: "https://www.databricks.com/blog/x" }).vendor.id, "databricks");
  const byMention = attributeVendor({
    url: "https://example.com/x",
    title: "Snowflake announces something",
  });
  assert.equal(byMention.vendor.id, "snowflake");
  assert.equal(byMention.confidence, "mention");
  assert.equal(attributeVendor({ url: "https://example.com/x", title: "Nobody" }).vendor, null);
});

test("a Tier 1 signal-bearing item outranks a Tier 4 recap of the same news", () => {
  const window = makeWindow();
  const context = { topic: TOPICS_BY_ID["pricing-packaging"], pass: null, window };
  const primary = normalizeResult(
    {
      url: "https://openai.com/api/pricing/",
      title: "Pricing moves to $0.40 per resolution",
      publishedDate: "2026-08-24T09:00:00Z",
      score: 0.7,
    },
    context,
  );
  const recap = normalizeResult(
    {
      url: "https://www.reuters.com/tech/openai-pricing",
      title: "OpenAI changes pricing to $0.40 per resolution",
      publishedDate: "2026-08-24T09:00:00Z",
      score: 0.95,
    },
    context,
  );
  assert.ok(primary.score > recap.score, "the primary source should win despite a lower Exa score");
});

// --- De-duplication ------------------------------------------------------

test("identical URLs collapse and the survivor keeps the other as corroboration", () => {
  const window = makeWindow();
  const base = {
    url: "https://www.sap.com/news/agents",
    title: "SAP ships an agent that resolves cases end to end",
    publishedDate: "2026-08-24T09:00:00Z",
  };
  const kept = dedupe([
    normalizeResult({ ...base, score: 0.9 }, { topic: TOPICS[0], pass: null, window }),
    normalizeResult({ ...base, score: 0.4 }, { topic: TOPICS[1], pass: null, window }),
  ]);
  assert.equal(kept.length, 1);
  assert.ok(kept[0].alsoTopics.length >= 1, "the second topic is recorded on the survivor");
});

test("near-identical titles from the same vendor collapse across domains", () => {
  const window = makeWindow();
  const context = { topic: TOPICS_BY_ID["distribution-capital"], pass: null, window };
  const kept = dedupe([
    normalizeResult(
      {
        url: "https://www.crowdstrike.com/press-releases/acquisition",
        title: "CrowdStrike acquires an agent observability startup",
        publishedDate: "2026-08-24T08:00:00Z",
        score: 0.8,
      },
      context,
    ),
    normalizeResult(
      {
        url: "https://www.reuters.com/tech/crowdstrike-acquires",
        title: "CrowdStrike acquires agent observability startup",
        publishedDate: "2026-08-24T08:30:00Z",
        score: 0.9,
      },
      context,
    ),
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].tier.number, 1, "the primary source survives");
  assert.equal(kept[0].corroboration.length, 1);
  assert.ok(kept[0].scoreBreakdown.corroboration > 0, "cross-tier corroboration is rewarded");
});

test("different stories from the same vendor are not merged", () => {
  const window = makeWindow();
  const context = { topic: TOPICS[0], pass: null, window };
  const kept = dedupe([
    normalizeResult(
      { url: "https://www.workday.com/a", title: "Workday launches a staffing agent", publishedDate: "2026-08-24T08:00:00Z" },
      context,
    ),
    normalizeResult(
      { url: "https://www.workday.com/b", title: "Workday changes pricing to consumption credits", publishedDate: "2026-08-24T08:00:00Z" },
      context,
    ),
  ]);
  assert.equal(kept.length, 2);
});

test("the inclusion standard splits lead from watch list", () => {
  const window = makeWindow();
  const context = { topic: TOPICS[0], pass: null, window };
  const { lead, watch } = applyInclusionStandard(
    dedupe([
      normalizeResult(
        { url: "https://www.zendesk.com/a", title: "Zendesk moves to per-resolution pricing", publishedDate: "2026-08-24T08:00:00Z" },
        context,
      ),
      normalizeResult(
        { url: "https://www.zendesk.com/b", title: "A small copy tweak in the admin console", publishedDate: "2026-08-24T08:00:00Z" },
        context,
      ),
    ]),
  );
  assert.equal(lead.length, 1);
  assert.equal(watch.length, 1);
});

// --- Exa payloads --------------------------------------------------------

test("every search pass carries the window's date bounds", () => {
  const window = makeWindow("7d");
  const passes = buildSearchPasses({ topics: TOPICS, cohorts: ["frontier-labs"], window });
  assert.ok(passes.length > 0);
  for (const pass of passes) {
    assert.equal(pass.payload.startPublishedDate, window.graceStartISO);
    assert.equal(pass.payload.endPublishedDate, window.endISO);
    assert.ok(Array.isArray(pass.payload.includeDomains) && pass.payload.includeDomains.length > 0);
    assert.ok(pass.payload.contents.summary.query.length > 0);
  }
});

test("the vendor-primary pass pins the cohort's own domains", () => {
  const passes = buildSearchPasses({
    topics: [TOPICS[0]],
    cohorts: ["data-platforms"],
    window: makeWindow(),
  });
  const primary = passes.find((p) => p.kind === "vendorPrimary");
  assert.ok(primary.payload.includeDomains.includes("databricks.com"));
  assert.ok(!primary.payload.includeDomains.includes("reuters.com"));
});

test("pricing passes always livecrawl, because cached pricing is wrong pricing", () => {
  const passes = buildSearchPasses({
    topics: [TOPICS_BY_ID["pricing-packaging"]],
    cohorts: ["enterprise-saas"],
    window: makeWindow(),
  });
  const primary = passes.find((p) => p.kind === "vendorPrimary");
  assert.equal(primary.payload.contents.livecrawl, "always");
});

test("budget allocation never silently drops a whole topic", () => {
  const window = makeWindow();
  const passes = buildSearchPasses({
    topics: TOPICS,
    cohorts: ["frontier-labs", "hyperscalers", "enterprise-saas"],
    window,
  });
  const budget = 6;
  const kept = allocateBudget(passes, budget);
  assert.equal(kept.length, budget);
  const coveredTopics = new Set(kept.map((p) => p.topicId));
  assert.equal(coveredTopics.size, TOPICS.length, "each selected topic keeps at least one pass");
});

test("allocation is a no-op when the budget already covers everything", () => {
  const passes = buildSearchPasses({ topics: [TOPICS[0]], cohorts: ["cybersecurity"], window: makeWindow() });
  assert.equal(allocateBudget(passes, 99).length, passes.length);
});

// --- End to end (sample mode) -------------------------------------------

test("a sample-mode brief renders through the real pipeline", async () => {
  const brief = await generateBrief({ preset: "2d", now: MONDAY_2PM_UTC, tzOffsetMinutes: PACIFIC_OFFSET });
  assert.equal(brief.demo, true);
  assert.ok(brief.sections.length > 0);
  assert.ok(brief.counts.lead > 0);
  for (const section of brief.sections) {
    for (const item of section.items) {
      assert.ok(item.signals.length >= 1, "every lead item cleared the inclusion standard");
      assert.equal(item.isSample, true, "sample items are stamped as such");
    }
  }
});

test("topic selection is honoured end to end", async () => {
  const brief = await generateBrief({
    preset: "7d",
    topicIds: ["pricing-packaging"],
    now: MONDAY_2PM_UTC,
  });
  assert.deepEqual(
    [...new Set(brief.sections.map((s) => s.topic.id))],
    ["pricing-packaging"],
  );
});

test("a narrow window excludes older developments", async () => {
  const wide = await generateBrief({ preset: "7d", now: MONDAY_2PM_UTC });
  const narrow = await generateBrief({ preset: "1d", now: MONDAY_2PM_UTC });
  assert.ok(narrow.counts.retrieved < wide.counts.retrieved);
});

test("markdown export keeps the brief's hierarchy and flags the sample banner", async () => {
  const brief = await generateBrief({ preset: "2d", now: MONDAY_2PM_UTC });
  const markdown = briefToMarkdown(brief);
  assert.match(markdown, /^# Vendor Brief/m);
  assert.match(markdown, /## Editor's note/);
  assert.match(markdown, /### Provenance/);
  assert.match(markdown, /Sample brief/);
  for (const section of brief.sections) {
    assert.ok(markdown.includes(`## ${section.topic.label}`));
  }
});

// --- Failure handling ----------------------------------------------------

test("a sample brief is never flagged as a retrieval failure", async () => {
  const brief = await generateBrief({ preset: "2d", now: MONDAY_2PM_UTC });
  assert.equal(brief.retrievalFailed, false);
});

test("when every search pass fails, the brief says so instead of reporting an empty news day", async () => {
  // Point the client at an unroutable base URL so every pass genuinely fails.
  const previousKey = process.env.EXA_API_KEY;
  const previousBase = process.env.EXA_BASE_URL;
  process.env.EXA_API_KEY = "test-key-not-a-real-credential";
  process.env.EXA_BASE_URL = "http://127.0.0.1:9";

  try {
    const brief = await generateBrief({
      preset: "1d",
      topicIds: ["pricing-packaging"],
      cohortIds: ["frontier-labs"],
      searchBudget: 2,
      includeEditorNote: false,
      now: MONDAY_2PM_UTC,
    });
    assert.equal(brief.demo, false);
    assert.equal(brief.retrievalFailed, true, "total failure must be flagged, not rendered as empty");
    assert.equal(brief.retrieval.succeeded, 0);
    assert.equal(brief.counts.lead, 0);
    assert.ok(brief.warnings.length > 0, "each failed pass is reported");
  } finally {
    if (previousKey === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previousKey;
    if (previousBase === undefined) delete process.env.EXA_BASE_URL;
    else process.env.EXA_BASE_URL = previousBase;
  }
});
