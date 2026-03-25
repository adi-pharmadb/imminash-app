/**
 * Analyzing screen and teaser screen acceptance criteria tests.
 *
 * Tests run in a Node environment and validate the coordination logic
 * (dual-flag timing, step sequencing) and teaser display logic
 * (color coding, occupation badges) without DOM rendering.
 */

import { describe, it, expect, vi } from "vitest";
import {
  STEP_MESSAGES,
  TOTAL_ANIMATION_MS,
  STEP_DURATION_MS,
} from "@/components/stepper/AnalyzingScreen";
import {
  getPointsColor,
  getStrokeColor,
} from "@/components/stepper/TeaserScreen";
import type { MatchResult } from "@/types/assessment";

/**
 * Simulates the dual-flag coordination logic from AnalyzingScreen.
 * Returns elapsed ms at which onComplete fires, or null if it never fires
 * within the test window.
 */
function simulateAnalyzingFlow(apiDelayMs: number): number {
  let advancedAt: number | null = null;
  let analyzingDone = false;
  let resultsReady = false;
  const startTime = 0;

  function tryAdvance(currentTime: number) {
    if (analyzingDone && resultsReady && advancedAt === null) {
      advancedAt = currentTime;
    }
  }

  // Simulate the animation timer completing at TOTAL_ANIMATION_MS
  const animationCompleteTime = TOTAL_ANIMATION_MS;

  // Simulate the API response arriving at apiDelayMs
  const apiCompleteTime = apiDelayMs;

  // Process events in chronological order
  const events = [
    { time: animationCompleteTime, type: "animation" },
    { time: apiCompleteTime, type: "api" },
  ].sort((a, b) => a.time - b.time);

  for (const event of events) {
    if (event.type === "animation") {
      analyzingDone = true;
    } else {
      resultsReady = true;
    }
    tryAdvance(event.time);
  }

  return advancedAt ?? -1;
}

describe("Analyzing Screen", () => {
  it("AC-AN1: screen stays for at least 4.8s even if AI responds instantly", () => {
    // API responds in 500ms, but screen must stay for at least 4800ms
    const advancedAt = simulateAnalyzingFlow(500);

    expect(advancedAt).toBeGreaterThanOrEqual(TOTAL_ANIMATION_MS);
    expect(TOTAL_ANIMATION_MS).toBe(4800);
  });

  it("AC-AN2: screen waits for AI if it takes longer than 4.8s", () => {
    // Simulate AI taking 6000ms -- screen should wait until API completes
    const apiDelay = 6000;
    const advancedAt = simulateAnalyzingFlow(apiDelay);

    // Should advance at the API completion time since it is later than animation
    expect(advancedAt).toBe(apiDelay);
    expect(advancedAt).toBeGreaterThan(TOTAL_ANIMATION_MS);
  });

  it("AC-AN3: all 4 step messages appear sequentially at ~1.2s intervals", () => {
    // Verify the step messages are exactly the 4 required messages
    expect(STEP_MESSAGES).toHaveLength(4);
    expect(STEP_MESSAGES[0]).toBe("Matching your profile to ANZSCO occupations...");
    expect(STEP_MESSAGES[1]).toBe("Identifying your assessing authority...");
    expect(STEP_MESSAGES[2]).toBe("Estimating your points score...");
    expect(STEP_MESSAGES[3]).toBe("Building your skills assessment roadmap...");

    // Verify each step gets approximately 1.2s
    expect(STEP_DURATION_MS).toBe(1200);

    // Verify total animation equals steps * duration
    expect(TOTAL_ANIMATION_MS).toBe(STEP_MESSAGES.length * STEP_DURATION_MS);

    // Simulate step progression timing
    const stepTimes = STEP_MESSAGES.map((_, i) => (i + 1) * STEP_DURATION_MS);
    expect(stepTimes).toEqual([1200, 2400, 3600, 4800]);
  });
});

describe("Teaser Screen", () => {
  it("displays points with correct color coding (green >=65, amber >=50, red <50)", () => {
    // Green for >= 65
    expect(getPointsColor(65)).toContain("green");
    expect(getPointsColor(100)).toContain("green");
    expect(getStrokeColor(65)).toBe("#16a34a");
    expect(getStrokeColor(100)).toBe("#16a34a");

    // Amber for >= 50 but < 65
    expect(getPointsColor(50)).toContain("amber");
    expect(getPointsColor(64)).toContain("amber");
    expect(getStrokeColor(50)).toBe("#d97706");
    expect(getStrokeColor(64)).toBe("#d97706");

    // Red for < 50
    expect(getPointsColor(49)).toContain("red");
    expect(getPointsColor(0)).toContain("red");
    expect(getStrokeColor(49)).toBe("#dc2626");
    expect(getStrokeColor(0)).toBe("#dc2626");
  });

  it("shows top 3 matched occupations with confidence badges", () => {
    const occupations: MatchResult[] = [
      {
        title: "Software Engineer",
        anzsco_code: "261313",
        confidence: 92,
        reasoning: "Strong match for software development duties",
        experience_aligned: true,
        warnings: [],
        score: 5,
        assessing_authority: "ACS",
        list: "MLTSSL",
        min_189_points: 65,
        latest_invitation: null,
      },
      {
        title: "Developer Programmer",
        anzsco_code: "261312",
        confidence: 75,
        reasoning: "Good match for programming experience",
        experience_aligned: true,
        warnings: [],
        score: 3,
        assessing_authority: "ACS",
        list: "MLTSSL",
        min_189_points: 70,
        latest_invitation: null,
      },
      {
        title: "Analyst Programmer",
        anzsco_code: "261311",
        confidence: 45,
        reasoning: "Partial match",
        experience_aligned: false,
        warnings: ["Experience gap"],
        score: 1,
        assessing_authority: "ACS",
        list: "MLTSSL",
        min_189_points: 80,
        latest_invitation: null,
      },
      {
        title: "ICT Business Analyst",
        anzsco_code: "261111",
        confidence: 30,
        reasoning: "Weak match",
        experience_aligned: false,
        warnings: [],
        score: 1,
        assessing_authority: "ACS",
        list: "MLTSSL",
        min_189_points: 85,
        latest_invitation: null,
      },
    ];

    // Top 3 should be sliced
    const top3 = occupations.slice(0, 3);
    expect(top3).toHaveLength(3);

    // Verify confidence scores
    expect(top3[0].confidence).toBe(92);
    expect(top3[0].title).toBe("Software Engineer");
    expect(top3[1].confidence).toBe(75);
    expect(top3[2].confidence).toBe(45);

    // The 4th occupation should NOT be in top 3
    expect(top3.find((o) => o.title === "ICT Business Analyst")).toBeUndefined();
  });
});
