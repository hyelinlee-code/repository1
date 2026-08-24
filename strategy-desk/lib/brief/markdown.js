/**
 * Render a brief as Markdown.
 *
 * The brief has to leave the app — into Slack, into a doc, into an email. This
 * keeps the same hierarchy the page uses so a pasted brief still reads as a
 * brief: editor's note, then topic sections, then the watch list, then the
 * provenance footer that makes the sourcing auditable.
 */

function formatDate(iso, locale = "en-US") {
  if (!iso) return "undated";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "undated";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function itemToMarkdown(item, index) {
  const lines = [];
  lines.push(`${index}. **[${item.title}](${item.url})**`);

  const meta = [
    item.vendorName ?? "Unattributed",
    `Tier ${item.tier.number} · ${item.tier.label}`,
    item.domain,
    formatDate(item.publishedDate),
  ].join(" · ");
  lines.push(`   _${meta}_`);

  if (item.signalLabels.length > 0) {
    lines.push(`   Signals: ${item.signalLabels.join(", ")}`);
  }
  if (item.summary) {
    lines.push(`   ${item.summary}`);
  }
  if (item.livePricingRead) {
    lines.push(`   Live pricing read: ${item.livePricingRead}`);
  }
  for (const highlight of item.highlights.slice(0, 2)) {
    lines.push(`   > ${highlight.trim()}`);
  }
  if (item.corroboration.length > 0) {
    const also = item.corroboration
      .slice(0, 3)
      .map((c) => `[${c.domain}](${c.url})`)
      .join(", ");
    lines.push(`   Also reported by: ${also}`);
  }
  if (item.needsVerification) {
    lines.push(`   ⚠︎ Quantitative or account-sourced claim — verify before quoting.`);
  }
  return lines.join("\n");
}

export function briefToMarkdown(brief) {
  if (!brief) return "";
  const { meta } = brief;
  const out = [];

  out.push(`# Vendor Brief — ${meta.window.label}`);
  out.push(
    `_${formatDate(meta.window.startISO)} → ${formatDate(meta.window.endISO)} · generated ${formatDate(meta.generatedAt)}_`,
  );
  out.push("");
  out.push(`**Core question.** ${meta.coreQuestion}`);
  out.push("");
  out.push(`**Lens.** ${meta.lens}`);
  out.push("");

  if (brief.demo) {
    out.push(
      "> **Sample brief.** No Exa API key is configured, so the items below are seeded illustrative content, not reporting. Do not quote them.",
    );
    out.push("");
  }

  // An exported empty brief must never be mistaken for a quiet news day.
  if (brief.retrievalFailed) {
    out.push(
      `> **Retrieval failed — treat this brief as not run.** All ${brief.retrieval?.attempted ?? 0} search passes failed, so nothing was retrieved. The absence of items below is not evidence of an absence of vendor activity.`,
    );
    out.push("");
  }

  if (brief.editorNote?.text) {
    out.push("## Editor's note");
    out.push(brief.editorNote.text);
    if (brief.editorNote.citations?.length) {
      out.push("");
      out.push(
        `Sources: ${brief.editorNote.citations.map((c) => `[${c.title}](${c.url})`).join(" · ")}`,
      );
    }
    out.push("");
  }

  if (brief.cohortRollup?.length) {
    out.push("## Who moved");
    for (const row of brief.cohortRollup) {
      const vendors = row.topVendors.length ? ` — ${row.topVendors.join(", ")}` : "";
      out.push(`- **${row.label}** (${row.count})${vendors}`);
    }
    out.push("");
  }

  let counter = 0;
  for (const section of brief.sections ?? []) {
    out.push(`## ${section.topic.label}`);
    out.push(`_${section.topic.lens}_`);
    out.push("");
    for (const item of section.items) {
      counter += 1;
      out.push(itemToMarkdown(item, counter));
      out.push("");
    }
  }

  if (brief.watch?.length) {
    out.push("## Watch list");
    out.push("_Below the inclusion standard: no named win, capability, price change, deal, or disclosed metric._");
    out.push("");
    for (const item of brief.watch.slice(0, 12)) {
      out.push(
        `- [${item.title}](${item.url}) — ${item.vendorName ?? item.domain} · Tier ${item.tier.number} · ${formatDate(item.publishedDate)}`,
      );
    }
    out.push("");
  }

  out.push("---");
  out.push("### Provenance");
  out.push(
    `- Topics: ${meta.topics.map((t) => t.label).join(", ")}`,
  );
  out.push(`- Cohorts: ${meta.cohorts.map((c) => c.label).join(", ")} (${meta.vendorCount} vendors)`);
  out.push(
    `- Retrieval: ${brief.exa.mode === "demo" ? "seeded sample" : `${brief.exa.calls} Exa call(s) across ${brief.exa.passesRun} passes, ${brief.exa.totalResults} results, $${brief.exa.totalCostUsd?.toFixed?.(4) ?? "0.0000"}`}`,
  );
  out.push(`- Kept ${brief.counts.lead} of ${brief.counts.afterDedupe} deduplicated results.`);
  if (brief.warnings?.length) {
    out.push(`- Warnings: ${brief.warnings.map((w) => `${w.pass}: ${w.message}`).join("; ")}`);
  }

  return out.join("\n");
}
