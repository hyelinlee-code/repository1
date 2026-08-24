"use client";

import { SECTION_PURPOSE } from "@/lib/config/topics";

/** The paper's nameplate. Everything here is orientation, not interaction. */
export default function Masthead({ liveReady, brief }) {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="pt-8 pb-6 sm:pt-12">
      <div className="masthead-rule pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="meta mb-2">ServiceNow · Corporate Strategy</p>
            <h1 className="display text-4xl font-semibold sm:text-5xl">Strategy Desk</h1>
          </div>
          <div className="flex items-center gap-3 no-print">
            <span
              className="chip"
              style={{ color: liveReady ? "var(--accent)" : "var(--tier-3)" }}
              title={
                liveReady
                  ? "EXA_API_KEY is configured — briefs run a live Exa sweep."
                  : "No EXA_API_KEY found — briefs render seeded sample content."
              }
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "currentColor" }}
              />
              {liveReady ? "Live · Exa" : "Sample mode"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-3">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{SECTION_PURPOSE}</p>
        <p className="meta">{today}</p>
      </div>

      {brief?.demo && (
        <div
          className="mt-5 rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: "color-mix(in oklab, var(--tier-3) 40%, transparent)",
            background: "color-mix(in oklab, var(--tier-3) 8%, transparent)",
          }}
        >
          <strong className="font-semibold">Sample brief.</strong>{" "}
          <span className="text-ink-soft">
            {brief.demoReason} Items below are illustrative placeholders written for this demo —
            they are not reporting and must not be quoted as vendor developments.
          </span>
        </div>
      )}
    </header>
  );
}
