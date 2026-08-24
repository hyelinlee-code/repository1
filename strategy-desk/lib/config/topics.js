/**
 * Topics to capture — Section 2 of the brief spec.
 *
 * Each topic carries three things the pipeline needs:
 *  - `queryTerms`: phrasing that gets fused with a vendor name into an Exa
 *    neural query. Exa matches on meaning, so these read like a sentence a
 *    relevant page would contain, not like keyword soup.
 *  - `summaryPrompt`: handed to Exa as `contents.summary.query`, so the
 *    summary that comes back is already framed as a strategy read rather than
 *    a generic abstract.
 *  - `lens`: the one-line strategic question the section is answering.
 */

export const TOPICS = [
  {
    id: "product-innovation",
    label: "Product innovation",
    short: "Product",
    lens: "Did the product move from insight into execution, and is the release cadence real?",
    definition:
      "New horizontal or vertical agents; where the product sits in the stack; whether it moves from insight into execution; and whether the vendor is sustaining a meaningful release cadence.",
    queryTerms: [
      "launched a new AI agent that executes work end to end",
      "general availability of an agentic product for enterprise customers",
      "new vertical agent for a specific business function",
    ],
    summaryPrompt:
      "In under 70 words: what exactly shipped, where in the stack it sits, and whether it executes work autonomously or only surfaces insight. Name the product. If this is an incremental update rather than a launch, say so.",
    accent: "product",
  },
  {
    id: "context-control-plane",
    label: "Context and control plane",
    short: "Control plane",
    lens: "Who is claiming the enterprise control point — the single pane of glass over agents?",
    definition:
      "Agent registries and gateways; identity and delegated authority; policy and runtime controls; observability and evaluation; semantic and context layers; relevant acquisitions; and implications for the enterprise control point or single pane of glass.",
    queryTerms: [
      "agent registry, gateway, or control plane for governing enterprise AI agents",
      "identity and delegated authority for AI agents, agent permissions and policy runtime",
      "observability and evaluation tooling for agents in production",
      "semantic layer or context layer for enterprise data and agents",
    ],
    summaryPrompt:
      "In under 70 words: what control-plane capability this adds (registry, identity, policy, observability, semantic layer), who it puts in the governing seat, and whether it competes with or complements an enterprise workflow platform.",
    accent: "control",
  },
  {
    id: "standards-ecosystem",
    label: "Standards and ecosystem",
    short: "Standards",
    lens: "Is the vendor authoring the protocol or merely adopting it — and is it shipped or just announced?",
    definition:
      "Who authors versus adopts key protocols; movement toward model-agnostic routing; reference implementations; partner adoption; and whether a standard is being implemented or only announced.",
    queryTerms: [
      "adopted or authored an agent interoperability protocol such as MCP or A2A",
      "model-agnostic routing, bring your own model, multi-model support",
      "reference implementation and partner adoption of an agent standard",
    ],
    summaryPrompt:
      "In under 70 words: which protocol or standard, whether this vendor is authoring or adopting it, and whether there is a shipped implementation and named partners — or only an announcement of intent.",
    accent: "standards",
  },
  {
    id: "pricing-packaging",
    label: "Pricing and packaging",
    short: "Pricing",
    lens: "What is the meter, and is it moving off seats toward consumption or outcomes?",
    definition:
      "The pricing meter used, including seats, platform fees, credits, tokens, conversations, resolutions, or outcomes; list-price and SKU changes; credit-pool design; margin implications; and movement toward consumption or outcome-based pricing.",
    queryTerms: [
      "changed pricing to consumption, credits, or outcome-based billing per resolution",
      "new SKU, list price change, or credit pool for AI agents",
      "price per conversation, per resolution, or per agent action",
    ],
    summaryPrompt:
      "In under 70 words: state the pricing meter explicitly (seat, platform fee, credit, token, conversation, resolution, outcome), any list price or SKU change with the number, and what it implies for gross margin. If no price is disclosed, say the price is undisclosed.",
    accent: "pricing",
  },
  {
    id: "distribution-capital",
    label: "Distribution, adoption, and capital",
    short: "Distribution",
    lens: "Did someone win a named account, buy distribution, or disclose a real adoption number?",
    definition:
      "Forward-deployed engineering and services expansion; marketplace, co-sell, and partner motions; named enterprise wins or incumbent displacement; funding, M&A, and IPO activity; and leadership changes with a clear commercial implication.",
    queryTerms: [
      "named enterprise customer win, deployment, or displacement of an incumbent vendor",
      "acquisition, funding round, or IPO filing with deal value disclosed",
      "marketplace listing, co-sell agreement, or forward-deployed engineering expansion",
      "executive hire or departure with a commercial implication",
    ],
    summaryPrompt:
      "In under 70 words: name the customer, acquirer, target, or investor and the disclosed figure (ARR, deal value, seat count, round size). If the number is not disclosed, say so rather than estimating.",
    accent: "distribution",
  },
];

export const TOPICS_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

export function resolveTopics(topicIds) {
  if (!topicIds || topicIds.length === 0) return TOPICS;
  return topicIds.map((id) => TOPICS_BY_ID[id]).filter(Boolean);
}

/**
 * The strategic lens the whole section is written through. This is prepended to
 * the Exa `/answer` call that produces the editor's note at the top of a brief.
 */
export const STRATEGIC_LENS =
  "Vendors across every layer of the technology stack are moving toward agentic execution, creating new competition around products, enterprise control points, ecosystems, pricing, and distribution.";

export const SECTION_PURPOSE =
  "Surface vendor actions that could change an assumption in our strategy — competitive position, pricing power, platform risk, addressable market, buyer behavior, or cost structure.";

export const CORE_QUESTION =
  "What did a vendor ship, price, acquire, partner on, or announce that materially changes our strategic view?";
