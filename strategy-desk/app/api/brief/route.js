import { NextResponse } from "next/server";
import { generateBrief, isDemoMode } from "@/lib/brief/generate";
import { TOPICS_BY_ID } from "@/lib/config/topics";
import { COHORTS_BY_ID, VENDORS_BY_ID } from "@/lib/config/vendors";
import { PRESETS_BY_ID } from "@/lib/brief/window";

// The Exa key lives only in this process. Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const LIMITS = {
  searchBudget: { min: 2, max: 40, fallback: 16 },
  resultsPerPass: { min: 3, max: 20, fallback: 8 },
};

function clamp(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function pickIds(input, registry) {
  if (!Array.isArray(input)) return undefined;
  const valid = input.filter((id) => typeof id === "string" && registry[id]);
  return valid.length > 0 ? valid : undefined;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const preset = PRESETS_BY_ID[body?.preset] ? body.preset : "1d";
  const payload = {
    preset,
    days: body?.days,
    from: body?.from,
    to: body?.to,
    tzOffsetMinutes: Number.isFinite(Number(body?.tzOffsetMinutes))
      ? Number(body.tzOffsetMinutes)
      : 0,
    topicIds: pickIds(body?.topicIds, TOPICS_BY_ID),
    cohortIds: pickIds(body?.cohortIds, COHORTS_BY_ID),
    vendorIds: pickIds(body?.vendorIds, VENDORS_BY_ID),
    searchBudget: clamp(body?.searchBudget, LIMITS.searchBudget),
    resultsPerPass: clamp(body?.resultsPerPass, LIMITS.resultsPerPass),
    includeEditorNote: body?.includeEditorNote !== false,
  };

  try {
    const brief = await generateBrief(payload);
    return NextResponse.json(brief, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    // Surface enough to debug a failed sweep without leaking the key or payload.
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    return NextResponse.json(
      {
        error: error?.message ?? "Brief generation failed.",
        endpoint: error?.endpoint ?? null,
        demoAvailable: true,
      },
      { status },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST a brief request to this endpoint.",
    mode: isDemoMode() ? "demo" : "live",
  });
}
