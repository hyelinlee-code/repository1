"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ControlRail from "./ControlRail";
import BriefView from "./BriefView";
import Masthead from "./Masthead";
import { TOPICS } from "@/lib/config/topics";
import { COHORTS } from "@/lib/config/vendors";
import { briefToMarkdown } from "@/lib/brief/markdown";

const ALL_TOPIC_IDS = TOPICS.map((t) => t.id);
const ALL_COHORT_IDS = COHORTS.map((c) => c.id);

/** Retrieval depth presets. Depth is a real cost dial, so it is named as one. */
export const DEPTH_PRESETS = [
  { id: "quick", label: "Quick", searchBudget: 8, resultsPerPass: 6, detail: "8 Exa passes" },
  { id: "standard", label: "Standard", searchBudget: 16, resultsPerPass: 8, detail: "16 Exa passes" },
  { id: "deep", label: "Deep", searchBudget: 28, resultsPerPass: 10, detail: "28 Exa passes" },
];

export default function DeskApp({ liveReady }) {
  const [preset, setPreset] = useState("1d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [topicIds, setTopicIds] = useState(ALL_TOPIC_IDS);
  const [cohortIds, setCohortIds] = useState(ALL_COHORT_IDS);
  const [vendorIds, setVendorIds] = useState([]); // empty = whole cohort
  const [depth, setDepth] = useState("standard");
  const [includeEditorNote, setIncludeEditorNote] = useState(true);

  const [brief, setBrief] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | running | ready | error
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const briefRef = useRef(null);

  const depthPreset = DEPTH_PRESETS.find((d) => d.id === depth) ?? DEPTH_PRESETS[1];

  const canGenerate =
    topicIds.length > 0 &&
    cohortIds.length > 0 &&
    (preset !== "custom" || Boolean(customFrom)) &&
    status !== "running";

  const generate = useCallback(async () => {
    setStatus("running");
    setError(null);
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preset,
          from: preset === "custom" ? customFrom : undefined,
          to: preset === "custom" ? customTo || undefined : undefined,
          // Sent so "today" and the weekend catch-up resolve against the
          // reader's calendar day rather than the server's.
          tzOffsetMinutes: new Date().getTimezoneOffset(),
          topicIds,
          cohortIds,
          vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
          searchBudget: depthPreset.searchBudget,
          resultsPerPass: depthPreset.resultsPerPass,
          includeEditorNote,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? `Request failed (${response.status})`);
      }
      setBrief(payload);
      setStatus("ready");
      requestAnimationFrame(() => {
        briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err.message ?? "Something went wrong generating the brief.");
      setStatus("error");
    }
  }, [
    preset,
    customFrom,
    customTo,
    topicIds,
    cohortIds,
    vendorIds,
    depthPreset,
    includeEditorNote,
  ]);

  const markdown = useMemo(() => (brief ? briefToMarkdown(brief) : ""), [brief]);

  const copyMarkdown = useCallback(async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was blocked. Use Download instead.");
    }
  }, [markdown]);

  const downloadMarkdown = useCallback(() => {
    if (!markdown || !brief) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = brief.meta.generatedAt.slice(0, 10);
    anchor.href = url;
    anchor.download = `vendor-brief-${stamp}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [markdown, brief]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8">
      <Masthead liveReady={liveReady} brief={brief} />

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <ControlRail
          preset={preset}
          setPreset={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          topicIds={topicIds}
          setTopicIds={setTopicIds}
          cohortIds={cohortIds}
          setCohortIds={setCohortIds}
          vendorIds={vendorIds}
          setVendorIds={setVendorIds}
          depth={depth}
          setDepth={setDepth}
          includeEditorNote={includeEditorNote}
          setIncludeEditorNote={setIncludeEditorNote}
          onGenerate={generate}
          canGenerate={canGenerate}
          status={status}
          liveReady={liveReady}
        />

        <main ref={briefRef} className="min-w-0">
          <BriefView
            brief={brief}
            status={status}
            error={error}
            liveReady={liveReady}
            onCopy={copyMarkdown}
            onDownload={downloadMarkdown}
            copied={copied}
          />
        </main>
      </div>
    </div>
  );
}
