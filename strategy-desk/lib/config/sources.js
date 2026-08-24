import { VENDOR_DOMAINS } from "./vendors.js";

/**
 * Source hierarchy — Section 4 of the brief spec.
 *
 * Tiers do two jobs in the pipeline:
 *  1. They drive Exa `includeDomains` on separate search passes, so a pricing
 *     sweep can be pinned to vendor pricing pages while a deal sweep is pinned
 *     to Reuters / Bloomberg / The Information.
 *  2. They set `weight`, which dominates ranking. A Tier-1 changelog entry
 *     outranks a Tier-4 recap of the same change, because the changelog is the
 *     primary record and the recap is a secondhand read of it.
 */

export const SOURCE_TIERS = [
  {
    tier: 1,
    id: "vendor-primary",
    label: "Vendor primary",
    weight: 1.0,
    description:
      "Vendor newsrooms, product blogs, changelogs, documentation, model cards, and live pricing pages.",
    primaryUse: "Product launches, feature details, pricing, and packaging.",
    // Vendor domains come from the vendor registry so the two never drift apart.
    domains: VENDOR_DOMAINS,
  },
  {
    tier: 2,
    id: "filings",
    label: "Filings and earnings",
    weight: 0.92,
    description: "Regulatory filings, earnings releases, and earnings-call commentary.",
    primaryUse: "Revenue mix, guidance, disclosed metrics, deal values, and adoption signals.",
    domains: [
      "sec.gov",
      "investor.salesforce.com",
      "investor.oracle.com",
      "investors.snowflake.com",
      "investors.palantir.com",
      "ir.crowdstrike.com",
      "newsroom.workday.com",
      "microsoft.com/en-us/investor",
      "abc.xyz",
      "ir.aboutamazon.com",
      "investors.sap.com",
      "investors.paloaltonetworks.com",
      "ir.zscaler.com",
      "investors.atlassian.com",
    ],
  },
  {
    tier: 3,
    id: "official-accounts",
    label: "Official accounts",
    weight: 0.72,
    description: "Official company, founder, and executive accounts.",
    primaryUse:
      "Early signals on launches and pricing changes. Quantitative claims need independent verification.",
    domains: ["x.com", "twitter.com", "linkedin.com", "threads.net", "bsky.app"],
    // Anything landing in this tier is flagged unverified in the rendered brief.
    requiresVerification: true,
  },
  {
    tier: 4,
    id: "business-press",
    label: "Business press",
    weight: 0.85,
    description: "Reuters, CNBC, Bloomberg, WSJ, FT, The Information, NYT, and Semafor.",
    primaryUse:
      "Private-company financials, deal reporting, customer wins, and executive moves.",
    domains: [
      "reuters.com",
      "cnbc.com",
      "bloomberg.com",
      "wsj.com",
      "ft.com",
      "theinformation.com",
      "nytimes.com",
      "semafor.com",
    ],
  },
  {
    tier: 5,
    id: "analysis",
    label: "Independent analysis",
    weight: 0.78,
    description:
      "SemiAnalysis, Artificial Analysis, Epoch AI, Stratechery, Benedict Evans, and credible investor or consultancy research.",
    primaryUse:
      "Normalized benchmarks, adoption surveys, and clearly attributed market interpretation.",
    domains: [
      "semianalysis.com",
      "artificialanalysis.ai",
      "epoch.ai",
      "epochai.org",
      "stratechery.com",
      "ben-evans.com",
      "a16z.com",
      "sequoiacap.com",
      "bvp.com",
      "mckinsey.com",
      "bain.com",
    ],
  },
];

export const TIERS_BY_ID = Object.fromEntries(SOURCE_TIERS.map((t) => [t.id, t]));
export const TIERS_BY_NUMBER = Object.fromEntries(SOURCE_TIERS.map((t) => [t.tier, t]));

/** Everything outside the hierarchy still gets a home, at a discount. */
export const UNRANKED_TIER = {
  tier: 6,
  id: "unranked",
  label: "Outside hierarchy",
  weight: 0.4,
  description: "Source is not in the approved hierarchy. Treat as a lead, not a citation.",
  primaryUse: "Lead generation only.",
  domains: [],
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Classify a URL into the source hierarchy. Matches on registrable-suffix so
 * `openai.com/index/foo` and `blog.openai.com` both resolve to Tier 1.
 */
export function classifySource(url) {
  const host = hostOf(url);
  if (!host) return UNRANKED_TIER;

  for (const tier of SOURCE_TIERS) {
    for (const domain of tier.domains) {
      const bare = domain.split("/")[0].replace(/^www\./, "").toLowerCase();
      if (host === bare || host.endsWith(`.${bare}`)) return tier;
    }
  }
  return UNRANKED_TIER;
}

export function displayDomain(url) {
  return hostOf(url) || url;
}

/** Domains for a set of tier ids, used to build Exa `includeDomains`. */
export function domainsForTiers(tierIds) {
  return [
    ...new Set(
      SOURCE_TIERS.filter((t) => tierIds.includes(t.id)).flatMap((t) =>
        t.domains.map((d) => d.split("/")[0]),
      ),
    ),
  ];
}
