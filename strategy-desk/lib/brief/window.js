/**
 * Date-window resolution.
 *
 * The operating cadence is a 2:00 p.m. weekday run plus a Monday morning
 * catch-up that sweeps Saturday and Sunday. Both are expressible as a window,
 * so the UI presets and the cron presets share this one resolver.
 *
 * Windows are resolved against the *viewer's* local day using an offset the
 * client sends (`Date.prototype.getTimezoneOffset`), so "since midnight today"
 * means their midnight, not the server's — without pulling in a tz library.
 */

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export const WINDOW_PRESETS = [
  { id: "1d", label: "1 day", detail: "Last 24 hours", days: 1 },
  { id: "2d", label: "2 days", detail: "Last 48 hours", days: 2 },
  { id: "3d", label: "3 days", detail: "Last 72 hours", days: 3 },
  { id: "7d", label: "7 days", detail: "Trailing week", days: 7 },
  { id: "14d", label: "14 days", detail: "Trailing fortnight", days: 14 },
  { id: "30d", label: "30 days", detail: "Trailing month", days: 30 },
  { id: "today", label: "Today", detail: "Since local midnight" },
  {
    id: "weekend",
    label: "Weekend catch-up",
    detail: "Saturday 00:00 through now — the Monday morning run",
  },
  { id: "custom", label: "Custom", detail: "Pick your own start and end" },
];

export const PRESETS_BY_ID = Object.fromEntries(WINDOW_PRESETS.map((p) => [p.id, p]));

/** Local wall-clock midnight for `at`, expressed as a real instant. */
function localMidnight(at, tzOffsetMinutes) {
  const local = new Date(at.getTime() - tzOffsetMinutes * MINUTE_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + tzOffsetMinutes * MINUTE_MS);
}

/** Local day of week, 0 = Sunday. */
function localDayOfWeek(at, tzOffsetMinutes) {
  return new Date(at.getTime() - tzOffsetMinutes * MINUTE_MS).getUTCDay();
}

function clampDays(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, Math.round(n)));
}

/**
 * @returns {{ start: Date, end: Date, startISO: string, endISO: string,
 *             label: string, detail: string, spanDays: number, presetId: string }}
 */
export function resolveWindow({
  preset = "1d",
  days,
  from,
  to,
  now = new Date(),
  tzOffsetMinutes = 0,
} = {}) {
  const end = new Date(now);
  let start;
  let label;
  let detail;

  switch (preset) {
    case "today": {
      start = localMidnight(end, tzOffsetMinutes);
      label = "Today";
      detail = "Since local midnight";
      break;
    }
    case "weekend": {
      // Walk back to the most recent Saturday 00:00 local. On a Monday run this
      // is Sat + Sun; run it midweek and it simply reaches further back.
      const midnight = localMidnight(end, tzOffsetMinutes);
      const dow = localDayOfWeek(end, tzOffsetMinutes);
      const daysSinceSaturday = (dow + 1) % 7; // Sat -> 0, Sun -> 1, Mon -> 2
      start = new Date(midnight.getTime() - daysSinceSaturday * DAY_MS);
      label = "Weekend catch-up";
      detail = "Saturday 00:00 through now";
      break;
    }
    case "custom": {
      const parsedFrom = from ? new Date(from) : null;
      const parsedTo = to ? new Date(to) : null;
      if (!parsedFrom || Number.isNaN(parsedFrom.getTime())) {
        // Fall back rather than fail: a bad custom range should still brief.
        return resolveWindow({ preset: "1d", now, tzOffsetMinutes });
      }
      start = parsedFrom;
      if (parsedTo && !Number.isNaN(parsedTo.getTime())) {
        end.setTime(Math.max(parsedTo.getTime(), start.getTime() + 1));
      }
      label = "Custom range";
      detail = `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;
      break;
    }
    default: {
      const preset_ = PRESETS_BY_ID[preset];
      const span = clampDays(days ?? preset_?.days, 1);
      start = new Date(end.getTime() - span * DAY_MS);
      label = span === 1 ? "1 day" : `${span} days`;
      detail = `Last ${span * 24} hours`;
    }
  }

  if (start.getTime() >= end.getTime()) {
    start = new Date(end.getTime() - DAY_MS);
  }

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label,
    detail,
    spanDays: Math.max(1, Math.round((end - start) / DAY_MS)),
    presetId: preset,
  };
}

/**
 * Exa filters on `publishedDate`, which many vendor pages report at day
 * granularity. Widening the *search* floor by a day and re-tightening during
 * scoring stops us from dropping a same-day changelog entry that Exa stamped
 * 00:00. `graceStartISO` goes to the API; `startISO` stays the honest boundary.
 */
export function withPublishGrace(window, graceHours = 24) {
  const graced = new Date(window.start.getTime() - graceHours * 3_600_000);
  return { ...window, graceStartISO: graced.toISOString() };
}

export function formatWindowRange(window, locale = "en-US") {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(window.start)} — ${fmt.format(window.end)}`;
}
