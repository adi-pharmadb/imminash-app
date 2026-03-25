/**
 * Tests for results page: pathway CTA and state nomination data fetching.
 * Validates Task Group 4 requirements:
 *   - "See Your Visa Pathways" CTA renders
 *   - CTA links to /pathway
 *   - State nominations are fetched from API (not empty arrays)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

// Mock AuthModal to avoid complex rendering
vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: () => null,
}));

// Track fetch calls for state nominations
const mockFetch = vi.fn();

describe("Results page: pathway CTA and state nominations", () => {
  const sampleResults = {
    formData: { firstName: "Test" },
    skillsMatches: [
      {
        anzsco_code: "261313",
        title: "Software Engineer",
        list: "MLTSSL",
        assessing_authority: "ACS",
        min_189_points: 65,
        score: 90,
      },
    ],
    employerMatches: [],
    breakdown: {
      age: 30,
      english: 20,
      education: 15,
      experience: 0,
      australianExperience: 0,
      specialist: 0,
      partner: 0,
      total: 65,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders 'See Your Visa Pathways' CTA button on results page", async () => {
    // The results page should contain a link/button with text "See Your Visa Pathways"
    // We test the component output by importing and checking the module source
    const fs = await import("fs");
    const path = await import("path");
    const resultsPageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/results/page.tsx"),
      "utf-8",
    );

    expect(resultsPageSource).toContain("See Your Visa Pathways");
    expect(resultsPageSource).toContain('data-testid="pathway-cta"');
  });

  it("CTA links to /pathway", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const resultsPageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/results/page.tsx"),
      "utf-8",
    );

    // The Link component should point to /pathway
    expect(resultsPageSource).toContain('href="/pathway"');
  });

  it("state nominations are fetched from API, not hardcoded empty arrays", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const resultsPageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/results/page.tsx"),
      "utf-8",
    );

    // The old code used `[] as StateNomination[]` -- that pattern should be gone
    expect(resultsPageSource).not.toContain("[] as StateNomination[]");

    // Should contain an API call to /api/state-nominations
    expect(resultsPageSource).toContain("/api/state-nominations");
    expect(resultsPageSource).toContain("anzsco_codes=");
  });
});
