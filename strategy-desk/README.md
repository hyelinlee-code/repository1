# Strategy Desk

A newsletter generator for the vendor section of the **ServiceNow Corporate Strategy** brief.
Pick a date window and a topic set, and it sweeps the vendor landscape with the
[Exa API](https://exa.ai), ranks what it finds against the section's own source hierarchy and
inclusion standard, and renders a brief you can read, copy, print, or export.

The section it produces is not a news recap. It answers one question:

> **What did a vendor ship, price, acquire, partner on, or announce that materially changes our
> strategic view?**

---

## Quickstart

```bash
cd strategy-desk
npm install
cp .env.example .env.local          # add your Exa key
npm run dev                         # http://localhost:3000
```

Without `EXA_API_KEY` the app still runs. It renders a **seeded sample brief** through the real
ranking pipeline, so every control, score, and export behaves identically — only the transport is
stubbed. Sample content is clearly labelled on screen and in exports; it is illustrative copy, not
reporting.

```bash
npm test                            # 26 tests over the pure pipeline, no network
EXA_API_KEY=... npm run smoke       # one live Exa pass, prints results, cost, and ranking
```

---

## The two things you customize

| Control | What it actually does |
| --- | --- |
| **Date window** | `1 / 2 / 3 / 7 / 14 / 30 days`, `Today`, `Weekend catch-up`, or a custom range. Sets `startPublishedDate` and `endPublishedDate` on every Exa search. |
| **Topics** | The five topics from the spec. Each carries its own Exa `contents.summary.query`, so summaries come back framed as a strategy read rather than a generic abstract. |

Two more dials sit alongside them: **vendor scope** (seven cohorts, 38 vendors, expandable to pin
individual companies) and **retrieval depth** (8 / 16 / 28 Exa passes — an honest cost dial, since
this runs twice a day forever).

`Today` and `Weekend catch-up` resolve against *your* local calendar day. The browser sends its
`getTimezoneOffset()` with the request, so a Monday-morning catch-up starts at Saturday 00:00 where
you are, not where the server is — without pulling in a timezone library.

### Operating cadence

The spec's schedule is expressible as windows, so the two scheduled runs are one-click presets:

| Run | Preset | Covers |
| --- | --- | --- |
| Weekday 2:00 p.m. | `1d` | Since yesterday's run |
| Monday morning catch-up | `weekend` | Saturday 00:00 through now |
| Weekly review | `7d` | Trailing seven days |

To automate it, `POST /api/brief` on a schedule — a Vercel cron entry is four lines:

```json
{ "crons": [{ "path": "/api/brief?preset=1d", "schedule": "0 21 * * 1-5" }] }
```

---

## How Exa is used

Exa does the retrieval *and* a meaningful share of the analysis. Three endpoints, each doing
something the others can't:

**`POST /search` — tiered sweeps.** The sweep is deliberately split by source tier rather than
fired as one broad query, because the tiers want different things:

| Pass | `includeDomains` | Why it's separate |
| --- | --- | --- |
| Vendor primary | The cohort's own newsrooms | Changelogs and pricing pages live here, and they are rarely categorised as "news" |
| Filings | SEC and IR sites | Only run for pricing and distribution topics, where a disclosed number *is* the signal |
| Business press | Reuters, Bloomberg, FT, The Information… | `category: "news"`; vendor names move into the query because the domain no longer identifies the subject |
| Independent analysis | SemiAnalysis, Epoch, Stratechery… | The numbers nobody self-reports |

Each pass sets `contents.summary.query` to a topic-specific analyst prompt, `contents.highlights`
against the topic's strategic lens for evidence quotes, and `livecrawl: "always"` on pricing pages —
a cached pricing page is the one artefact in this brief that can be confidently wrong.

**`POST /contents` — pricing re-reads.** Tier-1 pricing items are re-crawled at generation time and
summarised specifically for the meter in use (seat, platform fee, credit, token, conversation,
resolution, outcome).

**`POST /answer` — the editor's note.** One cited synthesis per brief, prompted with the strategic
lens and the developments already surfaced, and asked to name the single assumption that moved.

Every payload is visible in the app's **query inspector**, alongside per-call latency, result count,
and `costDollars`. "The AI found it" is not a sourcing standard; a reader should be able to see the
exact query, domain pins, and date bounds behind any claim and re-run it.

---

## How results are ranked

```
score = 0.34 · source tier
      + 0.38 · inclusion signals
      + 0.16 · recency within window
      + 0.12 · Exa relevance
      + corroboration bonus (capped)
```

Source tier and inclusion signals dominate on purpose: a Tier-1 changelog entry that names a pricing
meter should beat a Tier-4 write-up of the same change, even when Exa scores the write-up higher.
There's a test asserting exactly that.

**Inclusion standard.** Five detectors, one per high-value signal in the spec — named customer win,
new execution capability, pricing scheme change, scope or distribution shift, disclosed metric. An
item needs at least one to make the brief; everything else lands in a visible **watch list** rather
than being silently dropped. When nothing clears the bar, the brief says so instead of padding.

**De-duplication.** Exact URL match, then title overlap within the same vendor. The better-sourced
copy survives and the rest become corroboration — which is itself a quality signal, so a story
carried by both the vendor and Reuters scores slightly higher than either alone.

**Verification flags.** Quantitative claims and anything sourced from official social accounts
(Tier 3) are flagged on the card and in the Markdown export as needing independent verification,
per the spec's own caveat about that tier.

---

## Architecture

```
app/
  page.js                  server component; reads key presence, never the key
  api/brief/route.js       POST — validates input, runs the pipeline
  api/health/route.js      GET  — reports whether a live sweep is possible
lib/
  config/vendors.js        7 cohorts, 38 vendors, their newsroom domains
  config/topics.js         5 topics + per-topic Exa summary prompts
  config/sources.js        5-tier hierarchy, weights, URL classifier
  config/signals.js        inclusion-standard detectors
  exa/client.js            REST client: retries, backoff, concurrency gate, cost log
  exa/queryBuilder.js      request payloads + budget allocation
  brief/window.js          date-window resolution incl. weekend catch-up
  brief/score.js           attribution, ranking, de-duplication
  brief/generate.js        orchestration
  brief/markdown.js        export
  demo/fixtures.js         seeded sample data (Exa-shaped, real pipeline)
components/                DeskApp, ControlRail, BriefView, ItemCard, ExaInspector
tests/pipeline.test.mjs    26 tests, no network
```

The Exa key is read from the environment inside `lib/exa/client.js` at call time and never crosses
the server boundary. The browser learns only whether a key *exists*.

**Failure behaviour.** One failed pass doesn't sink the brief — passes run under a concurrency gate,
errors are collected per pass, and partial results render with a "partial results" note in the
inspector. Retries use exponential backoff and honour `Retry-After`.

When *every* pass fails, the brief refuses to render as an empty news day. It says "retrieval
failed — this is not an empty news day" on screen and in the Markdown export, because an empty brief
from a broken sweep is the most dangerous output this app can produce: a strategy team reading
silence as "no vendor moved" on a day one did.

---

## Design notes

Benchmarked against [thedesk.work](https://www.thedesk.work) as a reading surface rather than a
dashboard — paper ground, serif headlines, monospace metadata, and colour reserved for the two
things that carry meaning: source tier and inclusion signal.

*(Note: the reference site was unreachable from the build environment's network egress proxy, so the
visual direction here is drawn from the brief's own requirements and editorial conventions rather
than a direct visual audit. Worth a design pass against the live site before shipping.)*

Light and dark themes both ship; the print stylesheet turns the brief into a clean PDF with URLs
expanded as footnotes, since these get forwarded by email.

---

## Known limitations

- **Signal detection is lexical.** The five detectors are regex-based, which is fast, free, and
  fully inspectable, but it will miss a pricing change phrased unusually. An LLM classifier on the
  Exa summaries would raise recall at a per-item cost — worth doing once the false-negative rate is
  measured against real briefs.
- **Vendor attribution falls back to name matching** when the domain isn't a known newsroom. Those
  items are labelled `attribution: mention` on the card rather than being silently trusted.
- **No live API verification in this environment.** Outbound access to `api.exa.ai` was blocked from
  the build sandbox, so the client is written against the documented request and response shapes and
  exercised end-to-end through fixtures. `npm run smoke` is there to verify against the live API in
  one command the moment a key is available.
