#!/usr/bin/env node
/**
 * Live Exa smoke test.
 *
 * Runs one real pass of the actual pipeline — no mocks — and prints what came
 * back, what it cost, and how each result was classified. Use it to confirm a
 * key works and to sanity-check ranking against live data before trusting a
 * brief.
 *
 *   EXA_API_KEY=... npm run smoke
 *   EXA_API_KEY=... node scripts/exa-smoke.mjs --preset 7d --topic pricing-packaging
 */

import { generateBrief } from "../lib/brief/generate.js";
import { TOPICS_BY_ID } from "../lib/config/topics.js";
import { COHORTS_BY_ID } from "../lib/config/vendors.js";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (!process.env.EXA_API_KEY) {
  console.error("EXA_API_KEY is not set. Export it and re-run:\n  EXA_API_KEY=... npm run smoke");
  process.exit(1);
}
if (process.env.DEMO_MODE === "1") {
  console.error("DEMO_MODE=1 is set, which would stub the API. Unset it to smoke-test live.");
  process.exit(1);
}

const preset = arg("preset", "2d");
const topic = arg("topic", null);
const cohort = arg("cohort", "frontier-labs");

if (topic && !TOPICS_BY_ID[topic]) {
  console.error(`Unknown topic "${topic}". Options: ${Object.keys(TOPICS_BY_ID).join(", ")}`);
  process.exit(1);
}
if (cohort && !COHORTS_BY_ID[cohort]) {
  console.error(`Unknown cohort "${cohort}". Options: ${Object.keys(COHORTS_BY_ID).join(", ")}`);
  process.exit(1);
}

console.log(`Sweeping — window ${preset}, cohort ${cohort}${topic ? `, topic ${topic}` : ""}…\n`);

const brief = await generateBrief({
  preset,
  cohortIds: [cohort],
  topicIds: topic ? [topic] : undefined,
  searchBudget: 4,
  resultsPerPass: 6,
  tzOffsetMinutes: new Date().getTimezoneOffset(),
});

if (brief.demo) {
  console.error("Fell through to sample mode — the key was not picked up.");
  process.exit(1);
}

const { exa, counts } = brief;
console.log(`Exa: ${exa.calls} calls · ${exa.totalResults} results · $${exa.totalCostUsd.toFixed(4)} · ${(exa.elapsedMs / 1000).toFixed(1)}s`);
console.log(`Pipeline: ${counts.retrieved} retrieved → ${counts.afterDedupe} deduped → ${counts.lead} in brief, ${counts.watch} on watch\n`);

for (const section of brief.sections) {
  console.log(`## ${section.topic.label}`);
  for (const item of section.items.slice(0, 5)) {
    console.log(`  [${item.score.toFixed(3)}] T${item.tier.number} ${item.vendorName ?? item.domain}`);
    console.log(`         ${item.title}`);
    if (item.signalLabels.length) console.log(`         signals: ${item.signalLabels.join(", ")}`);
  }
  console.log("");
}

if (brief.editorNote?.text) {
  console.log("## Editor's note\n" + brief.editorNote.text + "\n");
}
if (brief.warnings.length) {
  console.log("Warnings:");
  for (const warning of brief.warnings) console.log(`  - ${warning.pass}: ${warning.message}`);
}
