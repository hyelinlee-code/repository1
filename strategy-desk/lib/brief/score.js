import { classifySource, displayDomain } from "../config/sources.js";
import { detectSignals } from "../config/signals.js";
import { ALL_VENDORS } from "../config/vendors.js";

/**
 * Ranking, attribution, and de-duplication.
 *
 * The section is not a news recap, so the ranker is opinionated about it:
 * source tier and inclusion-standard signals dominate, and Exa's own relevance
 * score is only a tiebreak. A Tier-1 changelog entry that names a pricing meter
 * should beat a Tier-4 write-up of the same change, every time.
 */

const WEIGHTS = {
  tier: 0.34,
  signal: 0.38,
  recency: 0.16,
  relevance: 0.12,
};

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Strip tracking params but keep anything that identifies the document.
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|ref|source|fbclid|gclid|mc_cid|mc_eid)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "its",
  "is", "are", "new", "announces", "announced", "launches", "launched", "says",
]);

function titleTokens(title) {
  return new Set(
    String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** Attribute a result to a vendor by domain first, then by name in the title. */
export function attributeVendor(result) {
  const host = displayDomain(result.url);
  const byDomain = ALL_VENDORS.find((vendor) =>
    vendor.domains.some((domain) => {
      const bare = domain.split("/")[0].replace(/^www\./, "").toLowerCase();
      return host === bare || host.endsWith(`.${bare}`);
    }),
  );
  if (byDomain) return { vendor: byDomain, confidence: "domain" };

  const haystack = `${result.title || ""} ${result.summary || ""}`.toLowerCase();
  const byName = ALL_VENDORS.find((vendor) => {
    const name = vendor.name.replace(/\s*\(.*\)$/, "").toLowerCase();
    return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
  });
  if (byName) return { vendor: byName, confidence: "mention" };

  return { vendor: null, confidence: "none" };
}

function recencyScore(publishedDate, window) {
  if (!publishedDate) return 0.45; // Undated: neither rewarded nor buried.
  const published = new Date(publishedDate).getTime();
  if (Number.isNaN(published)) return 0.45;
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (published > end) return 0.9; // Clock skew on a very fresh post.
  if (published < start) return 0.15; // Inside the grace band only.
  const span = Math.max(1, end - start);
  return 0.35 + 0.65 * ((published - start) / span);
}

/** Normalize one Exa result into the shape the brief renders. */
export function normalizeResult(result, { topic, pass, window }) {
  const tier = classifySource(result.url);
  const highlights = Array.isArray(result.highlights) ? result.highlights : [];
  const summary = typeof result.summary === "string" ? result.summary.trim() : "";
  const signals = detectSignals({ title: result.title, summary, highlights });
  const { vendor, confidence } = attributeVendor({ ...result, summary });

  const recency = recencyScore(result.publishedDate, window);
  const relevance = typeof result.score === "number" ? Math.min(1, Math.max(0, result.score)) : 0.5;

  const score =
    WEIGHTS.tier * tier.weight +
    WEIGHTS.signal * signals.strength +
    WEIGHTS.recency * recency +
    WEIGHTS.relevance * relevance;

  return {
    id: normalizeUrl(result.url),
    url: result.url,
    title: (result.title || displayDomain(result.url)).trim(),
    domain: displayDomain(result.url),
    publishedDate: result.publishedDate ?? null,
    author: result.author ?? null,
    image: result.image ?? null,
    favicon: result.favicon ?? null,
    summary,
    highlights,
    text: result.text ?? "",
    exaScore: typeof result.score === "number" ? result.score : null,
    tier: { number: tier.tier, id: tier.id, label: tier.label, weight: tier.weight },
    needsVerification: Boolean(tier.requiresVerification || signals.needsVerification),
    signals: signals.ids,
    signalLabels: signals.labels,
    signalStrength: signals.strength,
    vendorId: vendor?.id ?? null,
    vendorName: vendor?.name ?? null,
    cohortId: vendor?.cohortId ?? pass?.cohortId ?? null,
    cohortLabel: vendor?.cohortLabel ?? null,
    attribution: confidence,
    topicId: topic.id,
    topicLabel: topic.label,
    passId: pass?.id ?? null,
    passLabel: pass?.label ?? null,
    scoreBreakdown: {
      tier: Number((WEIGHTS.tier * tier.weight).toFixed(3)),
      signal: Number((WEIGHTS.signal * signals.strength).toFixed(3)),
      recency: Number((WEIGHTS.recency * recency).toFixed(3)),
      relevance: Number((WEIGHTS.relevance * relevance).toFixed(3)),
    },
    score: Number(score.toFixed(4)),
    corroboration: [],
  };
}

/**
 * Collapse duplicates. Two results are the same story when the URL matches, or
 * when they share a vendor and their titles overlap heavily. The higher-scoring
 * one survives; the other is kept as corroboration, which is itself a signal —
 * a story carried by both the vendor and Reuters is better sourced than either.
 */
export function dedupe(items) {
  const byUrl = new Map();
  for (const item of items) {
    const existing = byUrl.get(item.id);
    if (!existing) {
      byUrl.set(item.id, item);
      continue;
    }
    const [keep, drop] = existing.score >= item.score ? [existing, item] : [item, existing];
    keep.corroboration = mergeCorroboration(keep, drop);
    // A duplicate proves a second pass found it too — keep the richer topic set.
    keep.alsoTopics = [...new Set([...(keep.alsoTopics ?? []), drop.topicLabel])].filter(
      (t) => t !== keep.topicLabel,
    );
    byUrl.set(item.id, keep);
  }

  const survivors = [...byUrl.values()].sort((a, b) => b.score - a.score);
  const kept = [];

  for (const candidate of survivors) {
    const tokens = titleTokens(candidate.title);
    const twin = kept.find(
      (item) =>
        item.vendorId &&
        item.vendorId === candidate.vendorId &&
        jaccard(titleTokens(item.title), tokens) >= 0.6,
    );
    if (twin) {
      twin.corroboration = mergeCorroboration(twin, candidate);
      continue;
    }
    kept.push(candidate);
  }

  // Corroboration across tiers is a real quality signal — pay it forward.
  for (const item of kept) {
    if (item.corroboration.length > 0) {
      const distinctTiers = new Set(item.corroboration.map((c) => c.tier)).size;
      item.score = Number((item.score + Math.min(0.06, 0.03 * distinctTiers)).toFixed(4));
      item.scoreBreakdown.corroboration = Number(Math.min(0.06, 0.03 * distinctTiers).toFixed(3));
    }
  }

  return kept.sort((a, b) => b.score - a.score);
}

function mergeCorroboration(keep, drop) {
  const merged = [
    ...keep.corroboration,
    ...drop.corroboration,
    { url: drop.url, domain: drop.domain, tier: drop.tier.number, title: drop.title },
  ];
  const seen = new Set([keep.url]);
  return merged.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

/**
 * Split the ranked list against the inclusion standard. Items with at least one
 * high-value signal make the brief; the rest become a watch list, visible but
 * clearly below the bar.
 */
export function applyInclusionStandard(items, { minSignals = 1, maxLead = 40 } = {}) {
  const lead = [];
  const watch = [];
  for (const item of items) {
    if (item.signals.length >= minSignals && lead.length < maxLead) lead.push(item);
    else watch.push(item);
  }
  return { lead, watch };
}
