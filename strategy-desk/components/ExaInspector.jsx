"use client";

import { useState } from "react";

/**
 * Query inspector.
 *
 * Every card in the brief came from a specific Exa payload; this panel shows
 * them. It exists because "the AI found it" is not a sourcing standard — a
 * strategy reader should be able to see the exact query, domain pins, and date
 * bounds behind any claim, and re-run it themselves.
 */
export default function ExaInspector({ exa, warnings }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);

  if (!exa) return null;
  const requests = exa.requests ?? [];
  const isDemo = exa.mode === "demo";

  return (
    <section className="card-quiet mt-10 no-print">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>
          <span className="meta block">Exa query inspector</span>
          <span className="mt-1 block text-sm text-ink-soft">
            {isDemo
              ? "Sample mode — no API calls were made."
              : `${exa.calls} call${exa.calls === 1 ? "" : "s"} · ${exa.totalResults} results · $${exa.totalCostUsd?.toFixed(4)} · ${(exa.elapsedMs / 1000).toFixed(1)}s`}
          </span>
        </span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
          {open ? "hide ▴" : "show ▾"}
        </span>
      </button>

      {open && (
        <div className="border-t px-5 py-5 rise">
          {isDemo ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              This brief was rendered from seeded fixtures, so there are no requests to show. Set{" "}
              <code className="font-[family-name:var(--font-mono)] text-xs">EXA_API_KEY</code> and
              regenerate to see the live payloads — one per source tier, per topic, per cohort.
            </p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Passes planned" value={exa.passesPlanned} />
                <Stat label="Passes run" value={exa.passesRun} />
                <Stat label="Results" value={exa.totalResults} />
                <Stat label="Cost" value={`$${exa.totalCostUsd?.toFixed(4)}`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
                  {requests.map((request, index) => (
                    <li key={`${request.endpoint}-${index}`}>
                      <button
                        type="button"
                        className="toggle"
                        data-on={selected === index}
                        onClick={() => setSelected(index)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs">
                            {request.label ?? request.endpoint}
                          </span>
                          <span className="block truncate font-[family-name:var(--font-mono)] text-[0.625rem] text-ink-faint">
                            {request.endpoint} · {request.resultCount} · {request.durationMs}ms
                            {request.error ? " · failed" : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <pre className="max-h-72 overflow-auto rounded-md border p-3 font-[family-name:var(--font-mono)] text-[0.6875rem] leading-relaxed text-ink-soft">
{JSON.stringify(
  requests[selected]
    ? { endpoint: requests[selected].endpoint, body: requests[selected].payload }
    : {},
  null,
  2,
)}
                </pre>
              </div>
            </>
          )}

          {warnings?.length > 0 && (
            <div className="mt-4 rounded-md border px-3 py-2 text-xs" style={{ borderColor: "color-mix(in oklab, var(--warn) 40%, transparent)" }}>
              <span className="meta mb-1 block" style={{ color: "var(--warn)" }}>
                Partial results
              </span>
              <ul className="list-disc pl-4 text-ink-muted">
                {warnings.map((warning, index) => (
                  <li key={index}>
                    <span className="font-medium">{warning.pass}:</span> {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="meta">{label}</p>
      <p className="display mt-0.5 text-xl">{value}</p>
    </div>
  );
}
