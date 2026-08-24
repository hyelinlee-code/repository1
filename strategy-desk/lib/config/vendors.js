/**
 * Vendors in scope — Section 1 of the Corporate Strategy vendor-section brief.
 *
 * Each vendor carries the domains we trust as its primary newsroom. Those feed
 * Exa's `includeDomains` on Tier-1 passes, so a "product innovation" sweep for
 * OpenAI reads openai.com/index/... rather than a secondhand recap of it.
 */

export const COHORTS = [
  {
    id: "frontier-labs",
    label: "Frontier AI labs",
    blurb: "Model capability, agent runtimes, and the pricing floor everyone else prices against.",
    vendors: [
      { id: "openai", name: "OpenAI", domains: ["openai.com"] },
      { id: "anthropic", name: "Anthropic", domains: ["anthropic.com"] },
      { id: "google-deepmind", name: "Google DeepMind", domains: ["deepmind.google", "blog.google"] },
      { id: "xai", name: "xAI", domains: ["x.ai"] },
      { id: "meta-ai", name: "Meta AI", domains: ["ai.meta.com", "about.fb.com"] },
    ],
  },
  {
    id: "open-weight",
    label: "Open-weight AI",
    blurb: "Where the cost curve gets reset and where self-host becomes a credible enterprise option.",
    vendors: [
      { id: "deepseek", name: "DeepSeek", domains: ["deepseek.com", "api-docs.deepseek.com"] },
      { id: "moonshot", name: "Moonshot", domains: ["moonshot.ai", "moonshot.cn"] },
      { id: "alibaba", name: "Alibaba", domains: ["alibabacloud.com", "qwen.ai", "alizila.com"] },
      { id: "zai", name: "Z.AI", domains: ["z.ai", "bigmodel.cn"] },
      { id: "mistral", name: "Mistral", domains: ["mistral.ai"] },
      { id: "nvidia-open", name: "Nvidia (open releases)", domains: ["nvidia.com", "blogs.nvidia.com", "developer.nvidia.com"] },
      { id: "google-open", name: "Google (open releases)", domains: ["developers.googleblog.com", "blog.google"] },
    ],
  },
  {
    id: "hyperscalers",
    label: "Hyperscalers",
    blurb: "Distribution, marketplace economics, and the compute bill underneath every agent roadmap.",
    vendors: [
      { id: "microsoft-azure", name: "Microsoft / Azure", domains: ["azure.microsoft.com", "blogs.microsoft.com", "microsoft.com"] },
      { id: "aws", name: "AWS", domains: ["aws.amazon.com", "press.aboutamazon.com"] },
      { id: "google-cloud", name: "Google Cloud", domains: ["cloud.google.com"] },
      { id: "oracle", name: "Oracle", domains: ["oracle.com", "investor.oracle.com"] },
    ],
  },
  {
    id: "enterprise-saas",
    label: "Enterprise SaaS",
    blurb: "Our direct competitive set for workflow, seats, and the enterprise system of action.",
    vendors: [
      { id: "salesforce", name: "Salesforce", domains: ["salesforce.com", "investor.salesforce.com"] },
      { id: "microsoft-saas", name: "Microsoft", domains: ["microsoft.com", "blogs.microsoft.com", "techcommunity.microsoft.com"] },
      { id: "sap", name: "SAP", domains: ["sap.com", "news.sap.com"] },
      { id: "workday", name: "Workday", domains: ["workday.com", "newsroom.workday.com"] },
      { id: "atlassian", name: "Atlassian", domains: ["atlassian.com"] },
      { id: "zendesk", name: "Zendesk", domains: ["zendesk.com"] },
    ],
  },
  {
    id: "data-platforms",
    label: "Data platforms",
    blurb: "Semantic and context layers — the substrate an agent control plane has to sit on.",
    vendors: [
      { id: "databricks", name: "Databricks", domains: ["databricks.com"] },
      { id: "snowflake", name: "Snowflake", domains: ["snowflake.com", "investors.snowflake.com"] },
      { id: "palantir", name: "Palantir", domains: ["palantir.com", "investors.palantir.com"] },
      { id: "clickhouse", name: "ClickHouse", domains: ["clickhouse.com"] },
    ],
  },
  {
    id: "ai-native-apps",
    label: "AI-native applications",
    blurb: "Outcome-priced challengers attacking single workflows from above the platform.",
    vendors: [
      { id: "sierra", name: "Sierra", domains: ["sierra.ai"] },
      { id: "decagon", name: "Decagon", domains: ["decagon.ai"] },
      { id: "parloa", name: "Parloa", domains: ["parloa.com"] },
      { id: "glean", name: "Glean", domains: ["glean.com"] },
      { id: "harvey", name: "Harvey", domains: ["harvey.ai"] },
      { id: "serval", name: "Serval", domains: ["serval.com", "getserval.com"] },
      { id: "rox", name: "ROX", domains: ["rox.com"] },
      { id: "cursor", name: "Cursor", domains: ["cursor.com", "cursor.sh"] },
    ],
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    blurb: "Agent identity, delegated authority, and runtime policy — control-point competition.",
    vendors: [
      { id: "palo-alto", name: "Palo Alto Networks", domains: ["paloaltonetworks.com"] },
      { id: "crowdstrike", name: "CrowdStrike", domains: ["crowdstrike.com", "ir.crowdstrike.com"] },
      { id: "zscaler", name: "Zscaler", domains: ["zscaler.com"] },
      { id: "wiz", name: "Wiz", domains: ["wiz.io"] },
    ],
  },
];

/** Flat vendor list, each tagged with its cohort. */
export const ALL_VENDORS = COHORTS.flatMap((cohort) =>
  cohort.vendors.map((vendor) => ({
    ...vendor,
    cohortId: cohort.id,
    cohortLabel: cohort.label,
  })),
);

export const VENDORS_BY_ID = Object.fromEntries(ALL_VENDORS.map((v) => [v.id, v]));

export const COHORTS_BY_ID = Object.fromEntries(COHORTS.map((c) => [c.id, c]));

/** Every domain we treat as a vendor newsroom (Tier 1 of the source hierarchy). */
export const VENDOR_DOMAINS = [...new Set(ALL_VENDORS.flatMap((v) => v.domains))];

export function resolveVendors(vendorIds) {
  if (!vendorIds || vendorIds.length === 0) return ALL_VENDORS;
  return vendorIds.map((id) => VENDORS_BY_ID[id]).filter(Boolean);
}

/** Group a resolved vendor list back into cohort order for rendering. */
export function groupByCohort(vendors) {
  return COHORTS.map((cohort) => ({
    cohort,
    vendors: vendors.filter((v) => v.cohortId === cohort.id),
  })).filter((group) => group.vendors.length > 0);
}
