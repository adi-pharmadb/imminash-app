/**
 * POST /api/parse-cv
 *
 * Accepts a PDF or DOCX CV via FormData. Uses Claude's native document
 * content blocks to extract structured data (employers, qualifications)
 * directly from the file. PDFs are sent as-is (Claude reads them natively,
 * including scanned/image PDFs via vision). DOCX is converted to plain text
 * via mammoth first, then sent as a text block (Claude's native document
 * blocks don't accept DOCX).
 *
 * Returns { success, filename, extractedText, employers, qualifications, summary }.
 */

import mammoth from "mammoth";
import { anthropic, AI_MODEL } from "@/lib/anthropic";

interface Employer {
  name: string;
  title: string;
  startDate: string;
  endDate: string;
}

interface Qualification {
  name: string;
  institution: string;
  year: string;
}

interface ExtractedCv {
  extractedText: string;
  employers: Employer[];
  qualifications: Qualification[];
  summary: string;
}

const EXTRACT_INSTRUCTION = `You are parsing a CV/resume for an Australian skilled migration skills assessment. Extract structured data and return a SINGLE JSON object with these exact keys — no prose before or after:

{
  "extractedText": "<the first ~2000 chars of the CV as plain text, lightly cleaned>",
  "employers": [
    { "name": "<company name>", "title": "<job title>", "startDate": "<Mon YYYY or YYYY>", "endDate": "<Mon YYYY | YYYY | Present>" }
  ],
  "qualifications": [
    { "name": "<degree/cert name>", "institution": "<university/provider>", "year": "<graduation year YYYY>" }
  ],
  "summary": "<2-3 sentences: filename mentioned, how many employers found, how many qualifications, any concerns (e.g. scanned image, short CV, missing dates). Use friendly first-person tone: 'I picked up N employers...'>"
}

Rules:
- Order employers MOST RECENT FIRST.
- If the CV uses a current role (Present / Current / Ongoing), set endDate to "Present".
- Only include real employers — skip bullet-point duties and non-employer references.
- Only include real qualifications — skip certifications unless they are formal qualifications (Bachelor/Master/PhD/Diploma/Advanced Diploma).
- Do not fabricate. If a field is missing, use an empty string.
- Output JSON only. No markdown fences, no commentary.`;

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function stripJsonFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

function fallbackSummary(filename: string, message: string): ExtractedCv {
  return {
    extractedText: "",
    employers: [],
    qualifications: [],
    summary: `Thanks for uploading **${filename}**. ${message} No worries — I'll ask you everything I need step by step.`,
  };
}

async function extractWithClaude(
  content: Array<Record<string, unknown>>,
  filename: string,
): Promise<ExtractedCv> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          ...content,
          { type: "text", text: EXTRACT_INSTRUCTION },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      },
    ],
  });

  // Concatenate all text blocks in the response.
  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const jsonText = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("[parse-cv] Claude returned non-JSON:", raw.slice(0, 500));
    return fallbackSummary(
      filename,
      "I had trouble structuring the extracted data.",
    );
  }

  if (!parsed || typeof parsed !== "object") {
    return fallbackSummary(filename, "The parsed response was empty.");
  }

  const p = parsed as Record<string, unknown>;
  const employers = Array.isArray(p.employers)
    ? (p.employers as unknown[])
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => ({
          name: typeof e.name === "string" ? e.name : "",
          title: typeof e.title === "string" ? e.title : "",
          startDate: typeof e.startDate === "string" ? e.startDate : "",
          endDate: typeof e.endDate === "string" ? e.endDate : "",
        }))
    : [];
  const qualifications = Array.isArray(p.qualifications)
    ? (p.qualifications as unknown[])
        .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
        .map((q) => ({
          name: typeof q.name === "string" ? q.name : "",
          institution: typeof q.institution === "string" ? q.institution : "",
          year: typeof q.year === "string" ? q.year : "",
        }))
    : [];

  return {
    extractedText: typeof p.extractedText === "string" ? p.extractedText.slice(0, 3000) : "",
    employers,
    qualifications,
    summary:
      typeof p.summary === "string" && p.summary.trim().length > 0
        ? p.summary
        : `I picked up ${employers.length} employer${employers.length === 1 ? "" : "s"} and ${qualifications.length} qualification${qualifications.length === 1 ? "" : "s"} from **${filename}**.`,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Please upload a PDF or DOCX." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extracted: ExtractedCv;

    if (file.type === "application/pdf") {
      // Native Anthropic document input — Claude reads the PDF directly,
      // including scanned/image PDFs via vision.
      const base64 = buffer.toString("base64");
      extracted = await extractWithClaude(
        [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
        ],
        file.name,
      );
    } else {
      // DOCX: Claude doesn't accept .docx as a document block, so convert to
      // text via mammoth, then pass as a text block.
      let rawText: string;
      try {
        rawText = await extractTextFromDocx(buffer);
      } catch (extractionError) {
        console.error("DOCX extraction failed:", extractionError);
        return new Response(
          JSON.stringify({
            success: true,
            filename: file.name,
            ...fallbackSummary(
              file.name,
              "I had trouble reading the file — it may be corrupted.",
            ),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!rawText || rawText.trim().length < 50) {
        return new Response(
          JSON.stringify({
            success: true,
            filename: file.name,
            ...fallbackSummary(
              file.name,
              "The document looked empty or nearly so.",
            ),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      extracted = await extractWithClaude(
        [{ type: "text", text: `<cv_text>\n${rawText}\n</cv_text>` }],
        file.name,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        filename: file.name,
        ...extracted,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("parse-cv error:", error);
    return new Response(
      JSON.stringify({ error: "CV parsing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
