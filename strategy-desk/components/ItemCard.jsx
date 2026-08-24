"use client";

import { useState } from "react";

/**
 * One development. The card's job is to let a reader decide in about four
 * seconds whether this changes anything: title, who, how well sourced, which
 * inclusion signal it cleared, and the one-line strategic read from Exa.
 */

function relativeTime(iso) {
  if (!iso) return "undated";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "undated";
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;
  if (diffMinutes < 60 * 36) return `${Math.round(diffMinutes / 60)}h ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default function ItemCard({ item, index }) {
  const [showScore, setShowScore] = useState(false);
  const breakdown = item.scoreBreakdown ?? {};

  return (
    <article
      className="card p-5 transition-shadow hover:shadow-[var(--shadow-card)]"
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      <div className="flex items-start gap-4">
        <span
          className="mt-1 hidden w-6 flex-none text-right font-[family-name:var(--font-mono)] text-xs text-ink-faint sm:block"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          {/* Attribution line */}
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.vendorName && (
              <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] font-medium uppercase tracking-wider text-ink">
                {item.vendorName}
              </span>
            )}
            <span className={`chip tier-${item.tier.number}`} title={item.tier.label}>
              T{item.tier.number} {item.tier.label}
            </span>
            {item.isSample && (
              <span className="chip" style={{ color: "var(--tier-3)" }}>
                Sample
              </span>
            )}
            <span className="meta normal-case tracking-normal">
              {item.domain} · {relativeTime(item.publishedDate)}
            </span>
          </div>

          <h3 className="display mb-2 text-lg font-semibold sm:text-xl">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline decoration-1 underline-offset-4"
            >
              {item.title}
            </a>
          </h3>

          {item.summary && (
            <p className="prose-brief mb-3 text-sm text-ink-soft">{item.summary}</p>
          )}

          {item.livePricingRead && (
            <div
              className="mb-3 rounded-md border-l-2 px-3 py-2 text-sm"
              style={{ borderColor: "var(--accent)", background: "var(--accent-wash)" }}
            >
              <span className="meta mb-1 block">Livecrawled pricing page</span>
              <span className="text-ink-soft">{item.livePricingRead}</span>
            </div>
          )}

          {item.highlights?.length > 0 && (
            <blockquote
              className="mb-3 border-l-2 pl-3 text-sm italic text-ink-muted"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              {item.highlights[0].trim()}
            </blockquote>
          )}

          {/* Signals and provenance */}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.signalLabels?.map((label) => (
              <span key={label} className="chip chip-signal">
                {label}
              </span>
            ))}
            {item.alsoTopics?.map((label) => (
              <span key={label} className="chip chip-solid">
                also {label.toLowerCase()}
              </span>
            ))}
            {item.attribution === "mention" && (
              <span className="chip chip-solid" title="Vendor inferred from the text, not the domain">
                attribution: mention
              </span>
            )}
            {item.needsVerification && (
              <span className="chip" style={{ color: "var(--warn)" }}>
                verify claim
              </span>
            )}
          </div>

          {item.corroboration?.length > 0 && (
            <p className="mt-3 text-xs text-ink-faint">
              Also reported by{" "}
              {item.corroboration.slice(0, 3).map((source, i) => (
                <span key={source.url}>
                  {i > 0 && ", "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    {source.domain}
                  </a>
                  <span className="ml-0.5">(T{source.tier})</span>
                </span>
              ))}
            </p>
          )}

          {/* Why it ranked here — the ranker should be inspectable, not magic. */}
          <div className="mt-3 no-print">
            <button
              type="button"
              className="font-[family-name:var(--font-mono)] text-[0.6875rem] text-ink-faint underline underline-offset-2 hover:text-ink"
              onClick={() => setShowScore((value) => !value)}
              aria-expanded={showScore}
            >
              rank {item.score?.toFixed(3)} {showScore ? "▴" : "▾"}
            </button>

            {showScore && (
              <dl className="card-quiet mt-2 grid grid-cols-2 gap-x-4 gap-y-1 p-3 font-[family-name:var(--font-mono)] text-[0.6875rem] rise sm:grid-cols-4">
                {[
                  ["source tier", breakdown.tier],
                  ["signals", breakdown.signal],
                  ["recency", breakdown.recency],
                  ["exa relevance", breakdown.relevance],
                  ...(breakdown.corroboration
                    ? [["corroboration", breakdown.corroboration]]
                    : []),
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-ink-faint">{label}</dt>
                    <dd className="text-ink">{value?.toFixed?.(3) ?? "—"}</dd>
                  </div>
                ))}
                {item.exaScore != null && (
                  <div>
                    <dt className="text-ink-faint">exa score</dt>
                    <dd className="text-ink">{item.exaScore.toFixed(3)}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
