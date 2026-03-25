/**
 * GET /api/state-nominations
 *
 * Returns state nomination data for given ANZSCO codes.
 * Public access, no auth required (reference data).
 *
 * Query params:
 *   anzsco_codes - comma-separated ANZSCO codes (alphanumeric only)
 *
 * Response:
 *   { nominations: { [anzscoCode: string]: StateNomination[] } }
 *
 * Graceful error handling: returns empty nominations on DB failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StateNomination } from "@/types/database";

/** Only allow alphanumeric characters and commas in the query parameter. */
const VALID_CODES_PATTERN = /^[a-zA-Z0-9,]+$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const raw = searchParams.get("anzsco_codes");

    if (!raw || raw.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing required query parameter: anzsco_codes" },
        { status: 400 },
      );
    }

    if (!VALID_CODES_PATTERN.test(raw)) {
      return NextResponse.json(
        { error: "Invalid anzsco_codes parameter. Only alphanumeric characters and commas are allowed." },
        { status: 400 },
      );
    }

    const codes = raw
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (codes.length === 0) {
      return NextResponse.json(
        { error: "No valid ANZSCO codes provided" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("state_nominations")
      .select("*")
      .in("anzsco_code", codes);

    if (error) {
      console.error("Failed to fetch state nominations:", error);
      return NextResponse.json({ nominations: {} }, { status: 200 });
    }

    const nominations: Record<string, StateNomination[]> = {};
    for (const row of (data ?? []) as StateNomination[]) {
      const code = row.anzsco_code;
      if (!nominations[code]) {
        nominations[code] = [];
      }
      nominations[code].push(row);
    }

    return NextResponse.json({ nominations });
  } catch (error) {
    console.error("state-nominations route error:", error);
    return NextResponse.json({ nominations: {} }, { status: 200 });
  }
}
