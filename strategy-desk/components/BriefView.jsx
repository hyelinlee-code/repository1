"use client";

import ItemCard from "./ItemCard";
import ExaInspector from "./ExaInspector";
import { SOURCE_TIERS } from "@/lib/config/sources";
import { SIGNALS } from "@/lib/config/signals";
import { CORE_QUESTION, STRATEGIC_LENS } from "@/lib/config/topics";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function BriefView({
  brief,
  status,
  error,
  liveReady,
  onCopy,
  onDownload,
  copied,
}) {
  if (status === "running") return <RunningState liveReady={liveReady} />;
  if (status === "error") return <ErrorState error={error} />;
  if (!brief) return <EmptyState liveReady={liveReady} />;

  const { meta } = brief;
  const empty = (brief.sections ?? []).length === 0;

  return (
    <div className="rise">
      {/* --- Brief header --------------------------------------------------- */}
      <div className="hairline pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="meta mb-1.5">Vendor section · {meta.window.label}</p>
            <h2 className="display text-2xl font-semibold sm:text-3xl">
              {dateFmt.format(new Date(meta.window.startISO))} —{" "}
              {dateFmt.format(new Date(meta.window.endISO))}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <button type="button" className="btn-ghost" onClick={onCopy}>
              {copied ? "Copied ✓" : "Copy Markdown"}
            </button>
            <button type="button" className="btn-ghost" onClick={onDownload}>
              Download .md
            </button>
            <button type="button" className="btn-ghost" onClick={() => window.print()}>
              Print / PDF
            </button>
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
          <Fact label="Kept" value={`${brief.counts.lead} of ${brief.counts.afterDedupe}`} />
          <Fact label="Topics" value={meta.topics.length} />
          <Fact label="Vendors" value={meta.vendorCount} />
          <Fact
            label="Retrieval"
            value={
              brief.exa.mode === "demo"
                ? "sample"
                : `${brief.exa.calls} calls · $${brief.exa.totalCostUsd?.toFixed(3)}`
            }
          />
        </dl>
      </div>

      {/* --- Editor's note -------------------------------------------------- */}
      {brief.editorNote?.text && (
        <section className="hairline py-6">
          <p className="meta mb-3">
            Editor&apos;s note {brief.exa.mode === "live" && "· synthesized by Exa /answer"}
          </p>
          <p className="display text-lg leading-relaxed sm:text-xl">{brief.editorNote.text}</p>
          {brief.editorNote.citations?.length > 0 && (
            <p className="mt-3 text-xs text-ink-faint">
              Cited:{" "}
              {brief.editorNote.citations.map((citation, index) => (
                <span key={citation.url}>
                  {index > 0 && " · "}
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    {citation.title}
                  </a>
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      {/* --- Who moved ------------------------------------------------------ */}
      {brief.cohortRollup?.length > 0 && (
        <section className="hairline py-5">
          <p className="meta mb-3">Who moved</p>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {brief.cohortRollup.map((row) => (
              <div key={row.id} className="flex items-baseline gap-2">
                <span className="display w-6 flex-none text-lg">{row.count}</span>
                <span className="min-w-0">
                  <span className="block text-sm">{row.label}</span>
                  {row.topVendors.length > 0 && (
                    <span className="block truncate text-xs text-ink-faint">
                      {row.topVendors.join(", ")}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Sections ------------------------------------------------------- */}
      {brief.retrievalFailed ? (
        <RetrievalFailed brief={brief} />
      ) : empty ? (
        <NothingCleared brief={brief} />
      ) : (
        (brief.sections ?? []).map((section) => (
          <section key={section.topic.id} className="py-8">
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b pb-2">
              <h3 className="display text-xl font-semibold">{section.topic.label}</h3>
              <span className="meta">{section.items.length}</span>
            </div>
            <p className="mb-5 max-w-2xl text-sm italic text-ink-muted">{section.topic.lens}</p>
            <div className="flex flex-col gap-3">
              {section.items.map((item, index) => (
                <ItemCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* --- Watch list ----------------------------------------------------- */}
      {brief.watch?.length > 0 && (
        <section className="rule-top py-8">
          <h3 className="display mb-1 text-lg font-semibold">Watch list</h3>
          <p className="mb-4 max-w-2xl text-sm text-ink-muted">
            Retrieved and ranked, but no named win, execution capability, pricing change, deal, or
            disclosed metric — so it stays below the inclusion standard.
          </p>
          <ul className="flex flex-col">
            {brief.watch.slice(0, 12).map((item) => (
              <li key={item.id} className="hairline flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className={`chip tier-${item.tier.number}`}>T{item.tier.number}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {item.title}
                </a>
                <span className="meta normal-case tracking-normal">
                  {item.vendorName ?? item.domain}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExaInspector exa={brief.exa} warnings={brief.warnings} />
      <Methodology meta={meta} />
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="meta">{label}</dt>
      <dd className="mt-0.5 font-[family-name:var(--font-mono)] text-sm text-ink">{value}</dd>
    </div>
  );
}

/**
 * Every search pass failed. This must never be shown as "nothing happened" —
 * an empty brief from a broken sweep is the most dangerous output this app can
 * produce, so it says plainly that it retrieved nothing at all.
 */
function RetrievalFailed({ brief }) {
  const reasons = [...new Set((brief.warnings ?? []).map((w) => w.message))];
  return (
    <section
      className="card my-8 p-8"
      style={{ borderColor: "color-mix(in oklab, var(--warn) 45%, transparent)" }}
    >
      <p className="meta mb-2" style={{ color: "var(--warn)" }}>
        Retrieval failed — this is not an empty news day
      </p>
      <h3 className="display mb-3 text-xl">
        All {brief.retrieval?.attempted} search passes failed, so nothing was retrieved.
      </h3>
      <p className="mb-4 max-w-xl text-sm leading-relaxed text-ink-muted">
        Treat this brief as not run. Do not read the absence of items as an absence of vendor
        activity in the window.
      </p>
      {reasons.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1 font-[family-name:var(--font-mono)] text-xs text-ink-soft">
          {reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-ink-faint">
        A <strong>403</strong> usually means the key is invalid or the network blocks{" "}
        <code className="font-[family-name:var(--font-mono)]">api.exa.ai</code>; a{" "}
        <strong>429</strong> means the rate limit was hit, so lower the retrieval depth and re-run.
      </p>
    </section>
  );
}

function NothingCleared({ brief }) {
  return (
    <section className="card-quiet my-8 p-8 text-center">
      <h3 className="display mb-2 text-xl">Nothing cleared the bar in this window</h3>
      <p className="mx-auto max-w-lg text-sm leading-relaxed text-ink-muted">
        {brief.counts.afterDedupe} result{brief.counts.afterDedupe === 1 ? " was" : "s were"}{" "}
        retrieved and ranked, but none carried a named customer win, a new execution capability, a
        pricing change, an acquisition or partnership, or a disclosed metric. That is a legitimate
        answer for a one-day window — widen the window or add cohorts rather than lowering the bar.
      </p>
    </section>
  );
}

function RunningState({ liveReady }) {
  const steps = liveReady
    ? [
        "Resolving the date window",
        "Building tiered Exa passes",
        "Sweeping vendor newsrooms, filings, and press",
        "Scoring against the inclusion standard",
        "Synthesizing the editor's note",
      ]
    : ["Rendering seeded sample content through the live ranking pipeline"];

  return (
    <div className="card p-10 rise">
      <p className="meta mb-4">Generating</p>
      <ul className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-sm text-ink-soft">
            <span
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{
                background: "var(--accent)",
                opacity: 0.35 + index * 0.14,
              }}
              aria-hidden
            />
            {step}
          </li>
        ))}
      </ul>
      <div
        className="sweeping relative mt-8 h-0.5 overflow-hidden rounded"
        style={{ background: "var(--rule)" }}
        aria-hidden
      />
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="card p-8 rise" style={{ borderColor: "color-mix(in oklab, var(--warn) 45%, transparent)" }}>
      <p className="meta mb-2" style={{ color: "var(--warn)" }}>
        Sweep failed
      </p>
      <p className="mb-4 text-sm text-ink-soft">{error}</p>
      <p className="text-xs leading-relaxed text-ink-faint">
        Common causes: an invalid or exhausted <code className="font-[family-name:var(--font-mono)]">EXA_API_KEY</code>,
        a rate limit at high depth, or no outbound network access from the server. Lower the depth
        and try again, or unset the key to fall back to sample mode.
      </p>
    </div>
  );
}

function EmptyState({ liveReady }) {
  return (
    <div className="rise">
      <section className="card p-8">
        <p className="meta mb-3">The core question</p>
        <p className="display mb-6 text-xl leading-snug sm:text-2xl">{CORE_QUESTION}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          {STRATEGIC_LENS} Pick a window and a topic set on the left, then generate. Retrieval runs
          against the Exa API in tiered passes — one for vendor newsrooms, one for filings, one for
          the business press, one for independent analysis — and every result is ranked on source
          tier and the inclusion standard before it reaches the page.
        </p>
        {!liveReady && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint">
            No <code className="font-[family-name:var(--font-mono)]">EXA_API_KEY</code> is
            configured, so generating will render a seeded sample brief through the same ranking
            pipeline. The controls, scoring, grouping, and exports all behave identically.
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <p className="meta mb-4">Source hierarchy</p>
          <ul className="flex flex-col gap-3">
            {SOURCE_TIERS.map((tier) => (
              <li key={tier.id} className="flex gap-3">
                <span className={`chip tier-${tier.tier} mt-0.5 h-fit`}>T{tier.tier}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{tier.label}</span>
                  <span className="block text-xs leading-relaxed text-ink-faint">
                    {tier.primaryUse}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <p className="meta mb-4">Inclusion standard</p>
          <ul className="flex flex-col gap-3">
            {SIGNALS.map((signal) => (
              <li key={signal.id} className="flex gap-3">
                <span className="chip chip-signal mt-0.5 h-fit">✦</span>
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{signal.label}</span>
                  <span className="block text-xs leading-relaxed text-ink-faint">
                    {signal.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            An item needs at least one of these to make the brief. Everything else lands in the
            watch list.
          </p>
        </section>
      </div>
    </div>
  );
}

function Methodology({ meta }) {
  return (
    <footer className="rule-top mt-10 pt-6">
      <p className="meta mb-3">Method</p>
      <div className="grid gap-x-8 gap-y-3 text-xs leading-relaxed text-ink-faint sm:grid-cols-2">
        <p>
          <span className="text-ink-muted">Window.</span> {meta.window.detail}. Exa filters on
          publishedDate, widened by a 24-hour grace band to catch day-granularity timestamps, then
          re-tightened during scoring.
        </p>
        <p>
          <span className="text-ink-muted">Ranking.</span> Source tier 34%, inclusion signals 38%,
          recency 16%, Exa relevance 12%, plus a bonus when a story is corroborated across tiers.
        </p>
        <p>
          <span className="text-ink-muted">De-duplication.</span> Exact URL match, then title
          overlap within the same vendor. The better-sourced copy survives; the rest become
          corroboration.
        </p>
        <p>
          <span className="text-ink-muted">Verification.</span> Items carrying quantitative claims,
          or sourced from official accounts, are flagged for independent verification before they
          are quoted.
        </p>
      </div>
    </footer>
  );
}
