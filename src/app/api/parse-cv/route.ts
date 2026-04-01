/**
 * POST /api/parse-cv
 *
 * Accepts a PDF or DOCX CV upload via FormData. Extracts raw text using
 * pdf-parse (PDFs) or mammoth (DOCX), then runs regex-based heuristics
 * to detect employers, qualifications, and certifications.
 *
 * Returns structured JSON with extracted data and a quality-aware summary
 * per DocGen Brief 5.1 messaging tiers.
 */

import { PDFParse } from "pdf-parse";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import mammoth from "mammoth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Text extraction                                                    */
/* ------------------------------------------------------------------ */

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/* ------------------------------------------------------------------ */
/*  Parsing helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Matches common date patterns found in CVs:
 *   Jan 2020, January 2020, 01/2020, 2020, Present, Current
 */
const MONTH_NAMES =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

const DATE_TOKEN = `(?:${MONTH_NAMES}[\\s.,]*\\d{4}|\\d{1,2}[/\\-]\\d{4}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*[-–—to]+\\s*(${DATE_TOKEN}|[Pp]resent|[Cc]urrent|[Nn]ow|[Oo]ngoing)`,
  "g",
);

/**
 * Very broad heuristic: lines that contain a date range are likely
 * employer/role entries. We grab the preceding non-empty line as a
 * candidate employer or title.
 */
function parseEmployers(text: string): Employer[] {
  const lines = text.split(/\n/).map((l) => l.trim());
  const employers: Employer[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    DATE_RANGE_RE.lastIndex = 0;
    const match = DATE_RANGE_RE.exec(line);
    if (!match) continue;

    const startDate = match[1].trim();
    const endDate = match[2].trim();

    // Try to extract title and company from the same line or nearby lines
    const beforeDates = line.slice(0, match.index).trim();

    let name = "";
    let title = "";

    if (beforeDates.length > 2) {
      // If the text before the date range contains a separator, split it
      const parts = beforeDates.split(/\s*[|,–—-]+\s*/).filter(Boolean);
      if (parts.length >= 2) {
        title = parts[0];
        name = parts[1];
      } else {
        name = parts[0];
      }
    }

    // Look at surrounding lines for additional context
    if (!name && i > 0 && lines[i - 1].length > 1) {
      name = lines[i - 1];
    }
    if (!title && i > 1 && lines[i - 2].length > 1 && name) {
      title = lines[i - 2];
    }

    // Skip duplicate entries
    const key = `${name}::${startDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Clean up values -- strip trailing punctuation
    name = name.replace(/[.:;,]+$/, "").trim();
    title = title.replace(/[.:;,]+$/, "").trim();

    if (name || title) {
      employers.push({ name, title, startDate, endDate });
    }
  }

  return employers;
}

/**
 * Detects degree/qualification lines. Looks for keywords like
 * Bachelor, Master, PhD, Diploma, Certificate, etc.
 */
const DEGREE_RE =
  /\b(Bachelor|Master|PhD|Ph\.?D|Doctorate|Diploma|Certificate|Associate|MBA|BEng|BSc|BA|MSc|MA|MEng|LLB|LLM|BComm?|MComm?|Honours|Hons)\b/i;
const YEAR_RE = /\b(19|20)\d{2}\b/;

function parseQualifications(text: string): Qualification[] {
  const lines = text.split(/\n/).map((l) => l.trim());
  const qualifications: Qualification[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!DEGREE_RE.test(line)) continue;

    const yearMatch = line.match(YEAR_RE);
    const year = yearMatch ? yearMatch[0] : "";

    // Try to identify institution from the same line or the next line
    let institution = "";
    let name = line.replace(YEAR_RE, "").trim();

    // Check if next line looks like an institution (e.g. "University of ...")
    if (
      i + 1 < lines.length &&
      /university|college|institute|school|academy|polytechnic/i.test(
        lines[i + 1],
      )
    ) {
      institution = lines[i + 1].replace(YEAR_RE, "").trim();
    }

    // Or check same line for institution keywords
    if (!institution) {
      const uniMatch = line.match(
        /(?:at|from)?\s*((?:University|College|Institute|School|Academy|Polytechnic)\s+(?:of\s+)?[\w\s]+)/i,
      );
      if (uniMatch) {
        institution = uniMatch[1].trim();
        name = name.replace(uniMatch[0], "").trim();
      }
    }

    // Clean up the qualification name
    name = name.replace(/[.:;,|–—-]+$/, "").trim();
    institution = institution.replace(/[.:;,|–—-]+$/, "").trim();

    const key = `${name}::${year}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (name) {
      qualifications.push({ name, institution, year });
    }
  }

  return qualifications;
}

/* ------------------------------------------------------------------ */
/*  Quality assessment and summary                                     */
/* ------------------------------------------------------------------ */

function buildSummary(
  filename: string,
  employers: Employer[],
  qualifications: Qualification[],
  textLength: number,
): string {
  const roleCount = employers.length;
  const qualCount = qualifications.length;

  // Good CV -- we found meaningful data
  if (roleCount >= 2 && qualCount >= 1) {
    const degreeLabel =
      qualifications[0].name.length > 40
        ? "your qualification"
        : `your ${qualifications[0].name}`;
    return (
      `Great CV -- I've found ${roleCount} role${roleCount === 1 ? "" : "s"} and ${degreeLabel}. ` +
      `I'll use this as a starting point. I still need to ask you some specific questions about ` +
      `each role so the letters meet ACS standards.`
    );
  }

  // Average CV -- partial data detected
  if (roleCount >= 1 || qualCount >= 1) {
    const parts: string[] = [];
    if (roleCount > 0)
      parts.push(`${roleCount} role${roleCount === 1 ? "" : "s"}`);
    if (qualCount > 0)
      parts.push(
        `${qualCount} qualification${qualCount === 1 ? "" : "s"}`,
      );

    return (
      `Thanks for uploading **${filename}**. I was able to detect ${parts.join(" and ")} from your CV, ` +
      `but some details are unclear. I'll walk you through each section to fill in the gaps ` +
      `so the letters meet ACS standards.`
    );
  }

  // Poor CV -- very little or no structured data
  if (textLength < 200) {
    return (
      `Thanks for uploading **${filename}**. The file doesn't seem to contain much text -- ` +
      `it might be a scanned image or a very short document. No worries, I'll ask you ` +
      `everything I need step by step.`
    );
  }

  return (
    `Thanks for uploading **${filename}**. I wasn't able to pick out structured employment ` +
    `or qualification details automatically -- that's OK, many CVs use formats that are ` +
    `hard to parse. I'll ask you everything I need step by step so the letters meet ACS standards.`
  );
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

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
        JSON.stringify({
          error: "Invalid file type. Please upload a PDF or DOCX.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Convert the uploaded file into a Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract raw text based on file type
    let rawText: string;
    try {
      if (file.type === "application/pdf") {
        rawText = await extractTextFromPdf(buffer);
      } else {
        rawText = await extractTextFromDocx(buffer);
      }
    } catch (extractionError) {
      console.error("Text extraction failed:", extractionError);
      return new Response(
        JSON.stringify({
          success: true,
          filename: file.name,
          extractedText: "",
          employers: [],
          qualifications: [],
          summary:
            `Thanks for uploading **${file.name}**. I had trouble reading the file -- ` +
            `it may be password-protected or corrupted. No worries, I'll ask you ` +
            `everything I need step by step.`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse structured data from the extracted text
    const employers = parseEmployers(rawText);
    const qualifications = parseQualifications(rawText);
    const summary = buildSummary(
      file.name,
      employers,
      qualifications,
      rawText.length,
    );

    return new Response(
      JSON.stringify({
        success: true,
        filename: file.name,
        extractedText: rawText.slice(0, 3000),
        employers,
        qualifications,
        summary,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("parse-cv error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process CV" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
