/**
 * Admin data upload endpoint tests.
 *
 * Validates:
 * - AC-DM1: CSV upload upserts occupations (no duplicates)
 * - AC-DM2: CSV upload updates state nominations for specific state
 * - AC-DM3: Returns 401 without valid auth
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Mock setup: Supabase client                                        */
/* ------------------------------------------------------------------ */

const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

/**
 * Build a chainable Supabase query mock that tracks calls to
 * upsert / insert / delete / eq / select.
 */
function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.upsert = mockUpsert.mockReturnValue({ error: null });
  chain.insert = mockInsert.mockReturnValue({ error: null });
  chain.select = mockSelect.mockReturnValue({ single: () => ({ data: { id: "test" }, error: null }) });
  chain.delete = mockDelete.mockReturnValue({
    eq: mockEq.mockReturnValue({
      eq: mockEq.mockReturnValue({
        eq: mockEq.mockReturnValue({ error: null }),
        error: null,
      }),
      error: null,
    }),
    error: null,
  });
  chain.eq = mockEq;
  return chain;
}

const mockFrom = vi.fn().mockImplementation(() => buildChain());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

/* ------------------------------------------------------------------ */
/* Import after mocks are registered                                  */
/* ------------------------------------------------------------------ */

import { POST } from "@/app/api/admin/upload-data/route";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ADMIN_SECRET = "test-admin-secret";

beforeEach(() => {
  vi.stubEnv("ADMIN_SECRET", ADMIN_SECRET);
  mockFrom.mockClear();
  mockUpsert.mockClear();
  mockInsert.mockClear();
  mockDelete.mockClear();
  mockEq.mockClear();
  // Re-setup default return values after clear
  mockUpsert.mockReturnValue({ error: null });
  mockInsert.mockReturnValue({ error: null });
  mockDelete.mockReturnValue({
    eq: mockEq.mockReturnValue({
      eq: mockEq.mockReturnValue({
        eq: mockEq.mockReturnValue({ error: null }),
        error: null,
      }),
      error: null,
    }),
    error: null,
  });
});

function buildFormData(csv: string, table: string, state?: string): FormData {
  const form = new FormData();
  form.set("file", new Blob([csv], { type: "text/csv" }), "data.csv");
  form.set("table", table);
  if (state) form.set("state", state);
  return form;
}

function buildRequest(formData: FormData, secret?: string): Request {
  const headers = new Headers();
  if (secret) headers.set("x-admin-secret", secret);

  return new Request("http://localhost/api/admin/upload-data", {
    method: "POST",
    body: formData,
    headers,
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Admin Data Upload", () => {
  it("AC-DM1: CSV upload upserts occupations without duplicates", async () => {
    const csv = [
      "ANZSCO_Code,Occupation_Title,Skill_Level,Assessing_Authority,MLTSSL,STSOL,CSOL,ROL",
      "261313,Software Engineer,1,ACS,TRUE,FALSE,TRUE,FALSE",
      "261312,Developer Programmer,1,ACS,TRUE,FALSE,TRUE,FALSE",
      "261313,Software Engineer,1,ACS,TRUE,FALSE,TRUE,FALSE",
    ].join("\n");

    const form = buildFormData(csv, "occupations");
    const req = buildRequest(form, ADMIN_SECRET);
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // 3 CSV data rows (including the duplicate) should each trigger an upsert call
    expect(body.rows_processed).toBe(3);

    // Verify upsert was called on the occupations table
    expect(mockFrom).toHaveBeenCalledWith("occupations");

    // Verify upsert uses onConflict: "anzsco_code" so duplicates are updated not inserted
    const upsertCalls = mockUpsert.mock.calls;
    expect(upsertCalls.length).toBe(3);
    for (const call of upsertCalls) {
      expect(call[1]).toEqual({ onConflict: "anzsco_code" });
    }

    // Both calls for 261313 should upsert (update) rather than create duplicates
    const codes = upsertCalls.map((c) => c[0].anzsco_code);
    expect(codes.filter((c: string) => c === "261313").length).toBe(2);
    expect(codes.filter((c: string) => c === "261312").length).toBe(1);
  });

  it("AC-DM2: CSV upload updates state nominations for specific state", async () => {
    const csv = [
      "ANZSCO_Code,occupation_title,visa_190,visa_491",
      "261313,Software Engineer,eligible,closed",
      "261312,Developer Programmer,eligible,eligible",
    ].join("\n");

    const form = buildFormData(csv, "state_nominations", "nsw");
    const req = buildRequest(form, ADMIN_SECRET);
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.rows_processed).toBe(2);

    // Verify existing NSW rows were deleted first
    const fromCalls = mockFrom.mock.calls.map((c) => c[0]);
    expect(fromCalls[0]).toBe("state_nominations"); // delete call
    expect(mockDelete).toHaveBeenCalled();

    // Verify new rows were inserted (not upserted)
    expect(mockInsert).toHaveBeenCalledTimes(2);
    const firstInsert = mockInsert.mock.calls[0][0];
    expect(firstInsert.state).toBe("NSW");
    expect(firstInsert.anzsco_code).toBe("261313");
  });

  it("AC-DM3: Returns 401 without valid auth", async () => {
    const csv = "ANZSCO_Code,Occupation_Title\n261313,Software Engineer";
    const form = buildFormData(csv, "occupations");

    // No secret provided
    const reqNoSecret = buildRequest(form);
    const resNoSecret = await POST(reqNoSecret as unknown as import("next/server").NextRequest);
    expect(resNoSecret.status).toBe(401);

    // Wrong secret provided
    const reqWrongSecret = buildRequest(form, "wrong-secret");
    const resWrongSecret = await POST(reqWrongSecret as unknown as import("next/server").NextRequest);
    expect(resWrongSecret.status).toBe(401);

    // Supabase should never have been called
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
