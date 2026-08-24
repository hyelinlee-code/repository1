/**
 * Inclusion standard — Section 3 of the brief spec.
 *
 * The spec lists five high-value signals. Each one here is a detector with
 * patterns matched against an item's title, Exa summary, and highlights. A hit
 * does two things: it earns the item a large ranking bonus, and it earns a
 * visible chip in the brief so a reader can see *why* the item cleared the bar.
 *
 * An item with no signal hit is not automatically dropped, but it is pushed
 * below the fold into "Watch list" — the section is not a news recap.
 */

export const SIGNALS = [
  {
    id: "customer-win",
    label: "Named customer win",
    weight: 1.0,
    description: "A named enterprise customer win or displacement.",
    // Keyed on buyer-side language. Vendor-side verbs ("rolls out", "ships")
    // describe a launch, not a win, and belong to the capability detector.
    patterns: [
      /\b(?:chose|selected|standardi[sz]e[sd]? on|migrat(?:es|ed|ing) (?:to|from)|switch(?:es|ed|ing) from)\b/i,
      /\bdisplac(?:e|es|ed|ing)\b/i,
      /\breplac(?:e|es|ed|ing)\b[^.]{0,60}\b(?:incumbent|legacy|existing|deployment|vendor|platform|suite)\b/i,
      /\b(?:customer|client|enterprise) (?:win|logo|deployment)\b/i,
      /\bdeployed (?:by|at|across)\b/i,
      /\b(?:goes|went) live with\b/i,
    ],
  },
  {
    id: "execution-capability",
    label: "New execution capability",
    weight: 0.95,
    description: "A new execution capability or enterprise control point.",
    patterns: [
      /\b(?:agent|agents|agentic)\b.{0,60}\b(?:execute|executes|take action|takes action|act on|resolve|resolves|end[- ]to[- ]end)\b/i,
      /\b(?:control plane|context plane|single pane of glass|agent (?:registry|gateway)|governed gateway|policy (?:engine|runtime)|delegated authority|runtime controls?)\b/i,
      /\b(?:general availability|now generally available|GA)\b/i,
    ],
  },
  {
    id: "pricing-change",
    label: "Pricing scheme change",
    weight: 1.0,
    description: "A meaningful pricing scheme change, e.g. seat-based to usage-based.",
    patterns: [
      // Hyphenated meters ("per-resolution pricing") are at least as common as
      // the spaced form, so both have to match.
      /\bper[-\s](?:resolution|conversation|outcome|action|agent|token|credit)s?\b/i,
      /\b(?:consumption[- ]based|usage[- ]based|outcome[- ]based|credit pool|flex credits?)\b/i,
      /\b(?:mov(?:e|es|ed|ing)|shift(?:s|ed|ing)|switch(?:es|ed|ing))\s+(?:to|from|off)\b[^.]{0,45}\b(?:pricing|meter|billing|seats?)\b/i,
      /\b(?:pricing|price|list price|SKU)\b.{0,40}\b(?:change|changes|changed|update|updated|new|increase|decrease|cut)\b/i,
      /\$\s?\d[\d,.]*\s*(?:per|\/)\s*(?:seat|user|month|resolution|conversation|million tokens)/i,
    ],
  },
  {
    id: "scope-shift",
    label: "Scope or distribution shift",
    weight: 0.9,
    description: "An acquisition or partnership that changes product scope or distribution.",
    patterns: [
      /\b(?:acquir(?:e|es|ed|ing)|acquisition of|to buy|merger with)\b/i,
      /\b(?:partnership|partners with|strategic alliance|co[- ]sell|marketplace listing|reseller agreement)\b/i,
      /\b(?:integrat(?:es|ion) with)\b.{0,40}\b(?:native|first[- ]party)\b/i,
    ],
  },
  {
    id: "disclosed-metric",
    label: "Disclosed metric",
    weight: 0.95,
    description: "A disclosed adoption, revenue, usage, or unit-economics signal.",
    patterns: [
      /\$\s?\d[\d,.]*\s*(?:billion|million|B\b|M\b)/i,
      /\b\d[\d,.]*\s*(?:million|billion)?\s*(?:weekly|monthly|daily)?\s*(?:active )?(?:users|customers|developers|seats|agents|organizations)\b/i,
      /\b(?:ARR|annual recurring revenue|run[- ]rate|bookings|net revenue retention|NRR|gross margin)\b/i,
      /\b(?:grew|up|rose|increased)\s+\d{1,3}\s?%/i,
    ],
  },
];

export const SIGNALS_BY_ID = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));

/** Signals whose claims should be independently verified before quoting. */
const QUANTITATIVE_SIGNALS = new Set(["disclosed-metric", "pricing-change"]);

/**
 * Run the detectors over an item's text. Returns the matched signal ids in
 * spec order plus a normalized 0..1 strength used by the ranker.
 */
export function detectSignals({ title = "", summary = "", highlights = [] } = {}) {
  const haystack = [title, summary, ...(highlights || [])].join("\n");
  const matched = SIGNALS.filter((signal) =>
    signal.patterns.some((pattern) => pattern.test(haystack)),
  );

  const earned = matched.reduce((sum, s) => sum + s.weight, 0);
  const ceiling = SIGNALS.reduce((sum, s) => sum + s.weight, 0);

  return {
    ids: matched.map((s) => s.id),
    labels: matched.map((s) => s.label),
    strength: ceiling === 0 ? 0 : Math.min(1, earned / (ceiling * 0.6)),
    needsVerification: matched.some((s) => QUANTITATIVE_SIGNALS.has(s.id)),
  };
}
