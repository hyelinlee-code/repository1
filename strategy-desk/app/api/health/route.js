import { NextResponse } from "next/server";
import { hasExaKey } from "@/lib/exa/client";
import { isDemoMode } from "@/lib/brief/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether a live sweep is possible. Reports presence of the key, never its value. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    exaKeyConfigured: hasExaKey(),
    mode: isDemoMode() ? "demo" : "live",
    baseUrl: process.env.EXA_BASE_URL || "https://api.exa.ai",
  });
}
