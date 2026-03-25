import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";

const VALID_TABLES = ["occupations", "state_nominations", "invitation_rounds"] as const;
type TableName = (typeof VALID_TABLES)[number];

/**
 * POST /api/admin/upload-data
 *
 * Accepts a CSV file upload and upserts data into the specified table.
 * Requires ADMIN_SECRET header for authentication.
 *
 * Form fields:
 *   - file: CSV file (multipart)
 *   - table: one of "occupations", "state_nominations", "invitation_rounds"
 *   - state: required only when table is "state_nominations" (e.g. "nsw")
 */
export async function POST(request: NextRequest) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const table = formData.get("table") as string | null;
    const state = formData.get("state") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 },
      );
    }

    if (!table || !VALID_TABLES.includes(table as TableName)) {
      return NextResponse.json(
        { error: "Invalid table parameter. Must be one of: occupations, state_nominations, invitation_rounds" },
        { status: 400 },
      );
    }

    if (table === "state_nominations" && !state) {
      return NextResponse.json(
        { error: "Missing state parameter (required for state_nominations)" },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: parsed.errors },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    let rowsProcessed = 0;

    if (table === "occupations") {
      rowsProcessed = await upsertOccupations(supabase, parsed.data);
    } else if (table === "state_nominations") {
      rowsProcessed = await replaceStateNominations(supabase, parsed.data, state!);
    } else if (table === "invitation_rounds") {
      rowsProcessed = await upsertInvitationRounds(supabase, parsed.data);
    }

    return NextResponse.json(
      { success: true, rows_processed: rowsProcessed },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Upsert occupations on anzsco_code. Rows without a valid code are skipped.
 */
async function upsertOccupations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Record<string, string>[],
): Promise<number> {
  let count = 0;

  for (const row of rows) {
    const code = (row["ANZSCO_Code"] ?? row["anzsco_code"] ?? "").trim();
    const title = (row["Occupation_Title"] ?? row["title"] ?? "").trim();

    if (!code || !title) continue;

    const parseBool = (v: string | undefined): boolean =>
      (v ?? "").trim().toUpperCase() === "TRUE";

    const { error } = await supabase
      .from("occupations")
      .upsert(
        {
          anzsco_code: code,
          title,
          skill_level: row["Skill_Level"] ? parseInt(row["Skill_Level"], 10) || null : null,
          assessing_authority: (row["Assessing_Authority"] ?? row["assessing_authority"] ?? "").trim() || null,
          mltssl: parseBool(row["MLTSSL"]),
          stsol: parseBool(row["STSOL"]),
          csol: parseBool(row["CSOL"]),
          rol: parseBool(row["ROL"]),
          min_189_points: row["min_189_points"] ? parseInt(row["min_189_points"], 10) || null : null,
        },
        { onConflict: "anzsco_code" },
      );

    if (!error) count++;
  }

  return count;
}

/**
 * Replace all state nomination rows for a given state, then insert new rows.
 */
async function replaceStateNominations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Record<string, string>[],
  state: string,
): Promise<number> {
  const upperState = state.toUpperCase();

  await supabase
    .from("state_nominations")
    .delete()
    .eq("state", upperState);

  let count = 0;

  for (const row of rows) {
    const code = (row["ANZSCO_Code"] ?? row["anzsco_code"] ?? "").trim();
    if (!code) continue;

    const title = (row["Occupation_Title"] ?? row["occupation_title"] ?? row["Occupation"] ?? "").trim() || null;
    const visa190 = (row["visa_190"] ?? row["Skilled Nominated visa (subclass 190)"] ?? "").trim() || null;
    const visa491 = (row["visa_491"] ?? row["Skilled Work Regional visa (subclass 491)"] ?? "").trim() || null;
    const notes = (row["notes"] ?? row["Notes"] ?? "").trim() || null;

    const { error } = await supabase
      .from("state_nominations")
      .insert({
        state: upperState,
        anzsco_code: code,
        occupation_title: title,
        visa_190: visa190,
        visa_491: visa491,
        notes,
      });

    if (!error) count++;
  }

  return count;
}

/**
 * Upsert invitation rounds on the composite key (round_date, visa_subclass, occupation/anzsco_code).
 * Since Supabase upsert needs a unique constraint, we delete-and-reinsert matching rows.
 */
async function upsertInvitationRounds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Record<string, string>[],
): Promise<number> {
  let count = 0;

  for (const row of rows) {
    const roundDate = (row["round_date"] ?? "").trim();
    const visaSubclass = (row["visa_subclass"] ?? "").trim();
    const occupation = (row["occupation"] ?? row["anzsco_code"] ?? "").trim();

    if (!roundDate || !visaSubclass) continue;

    // Delete existing matching row if any
    await supabase
      .from("invitation_rounds")
      .delete()
      .eq("round_date", roundDate)
      .eq("visa_subclass", visaSubclass)
      .eq("anzsco_code", occupation);

    const { error } = await supabase
      .from("invitation_rounds")
      .insert({
        round_date: roundDate,
        visa_subclass: visaSubclass,
        anzsco_code: occupation,
        minimum_points: row["min_points"] ? parseInt(row["min_points"], 10) || null : null,
        invitations_issued: row["total_invited_round"] ? parseInt(row["total_invited_round"], 10) || null : null,
      });

    if (!error) count++;
  }

  return count;
}
