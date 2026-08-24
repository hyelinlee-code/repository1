"use client";

import { useState } from "react";
import { WINDOW_PRESETS } from "@/lib/brief/window";
import { TOPICS } from "@/lib/config/topics";
import { COHORTS } from "@/lib/config/vendors";
import { DEPTH_PRESETS } from "./DeskApp";

/**
 * The control rail is the product. Everything the spec leaves configurable —
 * window, topics, cohorts, retrieval depth — is a control here, and each one
 * maps to a specific field in the Exa request rather than to a client-side
 * filter over a fixed feed.
 */

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function Section({ title, hint, action, children }) {
  return (
    <section className="hairline pb-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="meta">{title}</h2>
        {action}
      </div>
      {hint && <p className="mb-3 text-xs leading-relaxed text-ink-faint">{hint}</p>}
      {children}
    </section>
  );
}

function SelectAll({ all, current, onChange }) {
  const isAll = current.length === all.length;
  return (
    <button
      type="button"
      className="text-[0.6875rem] text-ink-faint underline underline-offset-2 hover:text-ink"
      onClick={() => onChange(isAll ? [] : all)}
    >
      {isAll ? "clear" : "all"}
    </button>
  );
}

export default function ControlRail({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  topicIds,
  setTopicIds,
  cohortIds,
  setCohortIds,
  vendorIds,
  setVendorIds,
  depth,
  setDepth,
  includeEditorNote,
  setIncludeEditorNote,
  onGenerate,
  canGenerate,
  status,
  liveReady,
}) {
  const [expandedCohort, setExpandedCohort] = useState(null);
  const running = status === "running";

  const allTopicIds = TOPICS.map((t) => t.id);
  const allCohortIds = COHORTS.map((c) => c.id);
  const activeDepth = DEPTH_PRESETS.find((d) => d.id === depth) ?? DEPTH_PRESETS[1];

  /** Applying a cadence sets the window the way the real run would. */
  function applyCadence(id) {
    if (id === "weekday") setPreset("1d");
    if (id === "monday") setPreset("weekend");
    if (id === "week") setPreset("7d");
  }

  return (
    <aside className="no-print lg:sticky lg:top-6 lg:h-fit">
      <div
        className="card flex flex-col lg:max-h-[calc(100vh-3rem)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Settings scroll; the run button never leaves the viewport. */}
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {/* --- Window ---------------------------------------------------- */}
          <Section
            title="Date window"
            hint="Sets startPublishedDate and endPublishedDate on every Exa search."
          >
            <div className="flex flex-wrap gap-1.5">
              {WINDOW_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pill"
                  data-on={preset === option.id}
                  title={option.detail}
                  onClick={() => setPreset(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="mt-3 grid grid-cols-2 gap-2 rise">
                <label className="flex flex-col gap-1">
                  <span className="meta">From</span>
                  <input
                    type="date"
                    className="field"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="meta">To</span>
                  <input
                    type="date"
                    className="field"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </label>
              </div>
            )}

            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              {WINDOW_PRESETS.find((p) => p.id === preset)?.detail}
            </p>
          </Section>

          {/* --- Cadence --------------------------------------------------- */}
          <Section
            title="Operating cadence"
            hint="The two scheduled runs, as one-click window presets."
          >
            <div className="flex flex-col gap-1.5">
              <CadenceRow
                label="Weekday 2:00 p.m."
                detail="Since yesterday's run"
                active={preset === "1d"}
                onClick={() => applyCadence("weekday")}
              />
              <CadenceRow
                label="Monday catch-up"
                detail="Saturday and Sunday"
                active={preset === "weekend"}
                onClick={() => applyCadence("monday")}
              />
              <CadenceRow
                label="Weekly review"
                detail="Trailing seven days"
                active={preset === "7d"}
                onClick={() => applyCadence("week")}
              />
            </div>
          </Section>

          {/* --- Topics ---------------------------------------------------- */}
          <Section
            title="Topics"
            hint="Each topic carries its own Exa summary prompt, so summaries come back framed as a strategy read."
            action={<SelectAll all={allTopicIds} current={topicIds} onChange={setTopicIds} />}
          >
            <div className="flex flex-col gap-0.5">
              {TOPICS.map((topic) => {
                const on = topicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className="toggle"
                    data-on={on}
                    onClick={() => setTopicIds(toggle(topicIds, topic.id))}
                    title={topic.definition}
                  >
                    <span className="tick" aria-hidden>✓</span>
                    <span className="min-w-0">
                      <span className="block">{topic.label}</span>
                      <span className="block text-[0.6875rem] leading-snug text-ink-faint">
                        {topic.lens}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* --- Vendors --------------------------------------------------- */}
          <Section
            title="Vendors in scope"
            hint="Cohort domains become Exa includeDomains on the Tier 1 pass."
            action={<SelectAll all={allCohortIds} current={cohortIds} onChange={setCohortIds} />}
          >
            <div className="flex flex-col gap-0.5">
              {COHORTS.map((cohort) => {
                const on = cohortIds.includes(cohort.id);
                const expanded = expandedCohort === cohort.id;
                const selectedInCohort = cohort.vendors.filter((v) =>
                  vendorIds.includes(v.id),
                ).length;

                return (
                  <div key={cohort.id}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="toggle"
                        data-on={on}
                        onClick={() => setCohortIds(toggle(cohortIds, cohort.id))}
                        title={cohort.blurb}
                      >
                        <span className="tick" aria-hidden>✓</span>
                        <span className="min-w-0 flex-1">
                          <span className="block">{cohort.label}</span>
                          <span className="block text-[0.6875rem] text-ink-faint">
                            {selectedInCohort > 0
                              ? `${selectedInCohort} of ${cohort.vendors.length} pinned`
                              : `${cohort.vendors.length} vendors`}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${expanded ? "Hide" : "Show"} ${cohort.label} vendors`}
                        className="px-1.5 py-1 text-xs text-ink-faint hover:text-ink"
                        onClick={() => setExpandedCohort(expanded ? null : cohort.id)}
                      >
                        {expanded ? "−" : "+"}
                      </button>
                    </div>

                    {expanded && (
                      <div className="mb-2 ml-4 flex flex-wrap gap-1 rise">
                        {cohort.vendors.map((vendor) => (
                          <button
                            key={vendor.id}
                            type="button"
                            className="pill"
                            data-on={vendorIds.includes(vendor.id)}
                            onClick={() => setVendorIds(toggle(vendorIds, vendor.id))}
                            title={`Pin ${vendor.name} — ${vendor.domains[0]}`}
                          >
                            {vendor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {vendorIds.length > 0 && (
              <button
                type="button"
                className="mt-2 text-[0.6875rem] text-ink-faint underline underline-offset-2 hover:text-ink"
                onClick={() => setVendorIds([])}
              >
                clear {vendorIds.length} pinned vendor{vendorIds.length === 1 ? "" : "s"}
              </button>
            )}
          </Section>

          {/* --- Depth ----------------------------------------------------- */}
          <Section
            title="Retrieval depth"
            hint="Depth is a cost dial: more passes means broader coverage and more Exa credits."
          >
            <div className="flex gap-1.5">
              {DEPTH_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pill flex-1"
                  data-on={depth === option.id}
                  onClick={() => setDepth(option.id)}
                  title={option.detail}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              {activeDepth.detail} · up to {activeDepth.resultsPerPass} results each
            </p>

            <label className="toggle mt-2" data-on={includeEditorNote}>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeEditorNote}
                onChange={(event) => setIncludeEditorNote(event.target.checked)}
              />
              <span className="tick" aria-hidden>✓</span>
              <span className="min-w-0">
                <span className="block">Editor&apos;s note</span>
                <span className="block text-[0.6875rem] text-ink-faint">
                  One extra Exa /answer call
                </span>
              </span>
            </label>
          </Section>

        </div>

        {/* --- Run ----------------------------------------------------------- */}
        <div className="border-t p-4">
          <button
            type="button"
            className="btn-primary relative overflow-hidden"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {running ? (
              <>
                <span className="sweeping absolute inset-0" aria-hidden />
                <span className="relative">Sweeping sources…</span>
              </>
            ) : (
              <>Generate brief</>
            )}
          </button>

          <p className="mt-2 text-center text-[0.6875rem] leading-relaxed text-ink-faint">
            {topicIds.length === 0 || cohortIds.length === 0
              ? "Select at least one topic and one cohort."
              : `${topicIds.length} topic${topicIds.length === 1 ? "" : "s"} · ${cohortIds.length} cohort${cohortIds.length === 1 ? "" : "s"} · ${liveReady ? "live Exa sweep" : "sample mode"}`}
          </p>
        </div>
      </div>
    </aside>
  );
}

function CadenceRow({ label, detail, active, onClick }) {
  return (
    <button type="button" className="toggle" data-on={active} onClick={onClick}>
      <span
        className="inline-block h-1.5 w-1.5 flex-none rounded-full"
        style={{ background: active ? "var(--accent)" : "var(--rule-strong)" }}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block truncate text-[0.6875rem] text-ink-faint">{detail}</span>
      </span>
    </button>
  );
}
