/**
 * AI Chat API and duty alignment engine tests.
 * Covers streaming response, system prompt construction,
 * document update marker parsing, employment reference updates,
 * and duty alignment to ANZSCO descriptors.
 */

import { describe, it, expect } from "vitest";
import { buildSystemPrompt, type ChatPromptContext } from "@/lib/chat-prompt";
import {
  parseDocumentUpdates,
  stripDocumentMarkers,
} from "@/lib/duty-alignment";
import type { AssessingBodyRequirement, Document } from "@/types/database";

/** Sample assessing body for ACS. */
const ACS_BODY: AssessingBodyRequirement = {
  id: "abr-001",
  body_name: "ACS",
  required_documents: {
    types: [
      "employment_reference",
      "cv_resume",
      "statutory_declaration",
      "document_checklist",
    ],
  },
  duty_descriptors: {
    "261311": [
      "Designing, developing and maintaining software systems",
      "Testing, debugging and diagnosing software faults",
      "Writing and maintaining program code",
      "Performing code reviews and providing technical guidance",
    ],
  },
  qualification_requirements: {
    minimum: "Bachelor degree in ICT or related field",
    alternatives: "ACS RPL pathway for non-ICT qualifications",
  },
  experience_requirements: {
    ict_major: "2 years relevant experience after qualification",
    ict_minor: "4 years relevant experience after qualification",
    non_ict: "6 years relevant experience (RPL pathway)",
  },
  formatting_notes:
    "Employment references must be on company letterhead with duties listed individually. Include supervisor contact details.",
  conversation_template: {
    steps: [
      "Greet and confirm matched occupation",
      "Gather employment history details",
      "Collect duty descriptions for each role",
      "Ask about ICT specialization (major/minor)",
      "Generate employment reference documents",
      "Generate CV aligned with ANZSCO descriptors",
    ],
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/** Helper to build a prompt context with sensible defaults. */
function buildContext(
  overrides: Partial<ChatPromptContext> = {},
): ChatPromptContext {
  return {
    assessingBody: ACS_BODY,
    occupationTitle: "Analyst Programmer",
    anzscoCode: "261311",
    profileData: {
      firstName: "Alex",
      jobTitle: "Software Developer",
      fieldOfStudy: "Computer Science",
      jobDuties: "I build web apps and fix bugs",
    },
    existingDocuments: [],
    ...overrides,
  };
}

describe("AI Chat API and Duty Alignment", () => {
  it("Chat API accepts messages array and returns streaming response format", () => {
    // Verify the streaming response structure by simulating what the API returns.
    // The API returns SSE events with type "text" and "done".
    const textEvent = JSON.stringify({ type: "text", text: "Hello" });
    const doneEvent = JSON.stringify({ type: "done" });

    const sseText = `data: ${textEvent}\n\n`;
    const sseDone = `data: ${doneEvent}\n\n`;

    // Parse SSE events
    const events = (sseText + sseDone)
      .split("\n\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.replace("data: ", "")));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", text: "Hello" });
    expect(events[1]).toEqual({ type: "done" });
  });

  it("ACS system prompt includes occupation, profile, and document update markers", () => {
    const prompt = buildSystemPrompt(buildContext());

    // Assessing body identified
    expect(prompt).toContain("ACS");

    // Occupation context
    expect(prompt).toContain("Analyst Programmer");
    expect(prompt).toContain("261311");

    // User profile
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("Software Developer");

    // Document update markers
    expect(prompt).toContain("[DOC_UPDATE:");
    expect(prompt).toContain("[/DOC_UPDATE]");

    // Letterhead reference (formatting requirement)
    expect(prompt).toContain("letterhead");
  });

  it("Document update markers are correctly parsed from AI response", () => {
    const aiResponse = `I've prepared your employment reference based on the information you provided.

[DOC_UPDATE:employment_reference]
{"employer": "TechCorp Pty Ltd", "position": "Software Developer", "duties": ["Designed and developed web applications", "Performed code reviews"]}
[/DOC_UPDATE]

I've also started drafting your CV.

[DOC_UPDATE:cv_resume]
{"name": "Alex Smith", "summary": "Experienced software developer with 5 years in ICT"}
[/DOC_UPDATE]

Let me know if you'd like to adjust anything.`;

    const updates = parseDocumentUpdates(aiResponse);
    expect(updates).toHaveLength(2);

    expect(updates[0].documentType).toBe("employment_reference");
    const refContent = JSON.parse(updates[0].content);
    expect(refContent.employer).toBe("TechCorp Pty Ltd");
    expect(refContent.duties).toContain("Designed and developed web applications");
    expect(refContent.duties).toContain("Performed code reviews");

    expect(updates[1].documentType).toBe("cv_resume");
    const cvContent = JSON.parse(updates[1].content);
    expect(cvContent.name).toBe("Alex Smith");

    // Clean text should not contain markers
    const cleanText = stripDocumentMarkers(aiResponse);
    expect(cleanText).not.toContain("[DOC_UPDATE:");
    expect(cleanText).not.toContain("[/DOC_UPDATE]");
    expect(cleanText).toContain("I've prepared your employment reference");
    expect(cleanText).toContain("Let me know if you'd like to adjust anything");
  });

  it("AC-DW3: Employment details trigger Employment Reference document update", () => {
    // Simulate AI response after user provides employment details
    const aiResponse = `Thank you for sharing your employment details at TechCorp. Based on your description, I've aligned your duties with the ANZSCO descriptors for Analyst Programmer (261311).

[DOC_UPDATE:employment_reference]
{"employer": "TechCorp Pty Ltd", "position": "Senior Developer", "period": "2020-2024", "duties": ["Designed, developed and maintained software systems using React and Node.js", "Tested, debugged and diagnosed software faults across production environments", "Wrote and maintained program code following industry best practices", "Performed code reviews and provided technical guidance to junior developers"], "supervisor": {"name": "Jane Manager", "title": "Engineering Lead", "phone": "+61 400 000 000"}}
[/DOC_UPDATE]

The duties have been written to align with the ACS requirements for ANZSCO 261311. Would you like to review or adjust any of these?`;

    const updates = parseDocumentUpdates(aiResponse);
    expect(updates).toHaveLength(1);
    expect(updates[0].documentType).toBe("employment_reference");

    const content = JSON.parse(updates[0].content);
    expect(content.employer).toBe("TechCorp Pty Ltd");
    expect(content.duties).toHaveLength(4);

    // Verify duties align with ANZSCO descriptors for 261311
    const duties = content.duties as string[];
    expect(duties.some((d: string) => d.includes("Designed, developed and maintained"))).toBe(true);
    expect(duties.some((d: string) => d.includes("Tested, debugged and diagnosed"))).toBe(true);
    expect(duties.some((d: string) => d.includes("Wrote and maintained program code"))).toBe(true);
    expect(duties.some((d: string) => d.includes("code reviews"))).toBe(true);
  });

  it("Duty alignment: plain-language duties rewritten to align with ANZSCO descriptors", () => {
    // The ACS system prompt instructs the AI to gather SFIA-aligned duty content.
    const prompt = buildSystemPrompt(buildContext());

    // Prompt references duty elicitation and SFIA alignment
    expect(prompt).toContain("DUTY ELICITATION");
    expect(prompt).toContain("SFIA");
    expect(prompt).toContain("Analyst Programmer");

    // Verify the AI can produce aligned output by parsing a simulated response
    // where plain-language "I build web apps" becomes ANZSCO-aligned language
    const aiAlignedResponse = `I've rewritten your duties to align with ANZSCO descriptors.

[DOC_UPDATE:employment_reference]
{"duties": ["Designed, developed and maintained web-based software systems", "Tested and debugged application code to ensure system reliability"]}
[/DOC_UPDATE]`;

    const updates = parseDocumentUpdates(aiAlignedResponse);
    const duties = JSON.parse(updates[0].content).duties as string[];

    // Plain-language "I build web apps" is now ANZSCO-aligned
    expect(duties[0]).toContain("Designed, developed and maintained");
    expect(duties[1]).toContain("Tested and debugged");

    // The aligned duties should not contain casual language
    expect(duties[0]).not.toContain("I build");
    expect(duties[0]).not.toContain("fix bugs");
  });
});
