/**
 * Tests for GET /api/state-nominations endpoint.
 * Validates query parameter handling, response grouping, and error resilience.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the Supabase server client before importing the route handler
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs);
          return {
            in: (...inArgs: unknown[]) => {
              mockIn(...inArgs);
              return mockIn.getMockImplementation()
                ? mockIn(...inArgs)
                : { data: [], error: null };
            },
          };
        },
      };
    },
  }),
}));

// Import after mocking
import { GET } from "@/app/api/state-nominations/route";

function buildRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function buildNomination(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-id",
    state: "NSW",
    anzsco_code: "261313",
    occupation_title: "Software Engineer",
    visa_190: "Yes",
    visa_491: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/state-nominations", () => {
  it("returns nomination data grouped by ANZSCO code for a single code", async () => {
    const nominations = [
      buildNomination({ state: "NSW", anzsco_code: "261313" }),
      buildNomination({ state: "VIC", anzsco_code: "261313" }),
    ];

    mockIn.mockReturnValue({ data: nominations, error: null });

    const response = await GET(buildRequest("/api/state-nominations?anzsco_codes=261313"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nominations).toBeDefined();
    expect(body.nominations["261313"]).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith("state_nominations");
  });

  it("returns empty object for unknown ANZSCO codes", async () => {
    mockIn.mockReturnValue({ data: [], error: null });

    const response = await GET(buildRequest("/api/state-nominations?anzsco_codes=999999"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nominations).toEqual({});
  });

  it("handles multiple ANZSCO codes comma-separated", async () => {
    const nominations = [
      buildNomination({ state: "NSW", anzsco_code: "261313" }),
      buildNomination({ state: "SA", anzsco_code: "261312" }),
    ];

    mockIn.mockReturnValue({ data: nominations, error: null });

    const response = await GET(
      buildRequest("/api/state-nominations?anzsco_codes=261313,261312"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nominations["261313"]).toHaveLength(1);
    expect(body.nominations["261312"]).toHaveLength(1);
    expect(mockIn).toHaveBeenCalledWith("anzsco_code", ["261313", "261312"]);
  });

  it("returns 400 for missing anzsco_codes parameter", async () => {
    const response = await GET(buildRequest("/api/state-nominations"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid characters in anzsco_codes parameter", async () => {
    const response = await GET(
      buildRequest("/api/state-nominations?anzsco_codes=261313;DROP TABLE"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns empty nominations gracefully on database error", async () => {
    mockIn.mockReturnValue({ data: null, error: { message: "DB connection failed" } });

    const response = await GET(buildRequest("/api/state-nominations?anzsco_codes=261313"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nominations).toEqual({});
  });
});
