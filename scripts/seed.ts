/**
 * Comprehensive seed script for Imminash Beta V1.
 *
 * Seeds all reference data tables:
 * - occupations (from occupations.csv)
 * - state_nominations (from 6 state CSVs + VIC derived + NT closed)
 * - invitation_rounds (from rounds.csv)
 * - assessing_body_requirements (Big 4 hardcoded)
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEED_DATA_DIR = path.resolve(__dirname, "../supabase/seed-data");

// ---------------------------------------------------------------------------
// Utility: CSV parsing helpers (ported from legacy stateNominationData.ts)
// ---------------------------------------------------------------------------

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\bnec\b/gi, "")
    .replace(/\bnfd\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// 1. Seed Occupations
// ---------------------------------------------------------------------------

interface OccupationRow {
  anzsco_code: string;
  title: string;
  skill_level: number | null;
  assessing_authority: string | null;
  mltssl: boolean;
  stsol: boolean;
  csol: boolean;
  rol: boolean;
  min_189_points: number | null;
}

async function seedOccupations(): Promise<OccupationRow[]> {
  const csvPath = path.join(SEED_DATA_DIR, "occupations.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows: OccupationRow[] = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const code = row["ANZSCO_Code"]?.trim();
    const title = row["Occupation_Title"]?.trim();
    if (!code || !title) continue;

    rows.push({
      anzsco_code: code,
      title,
      skill_level: row["Skill_Level"]?.trim()
        ? parseInt(row["Skill_Level"].trim(), 10)
        : null,
      assessing_authority: row["Assessing_Authority"]?.trim() || null,
      mltssl: row["MLTSSL"]?.trim().toUpperCase() === "TRUE",
      stsol: row["STSOL"]?.trim().toUpperCase() === "TRUE",
      csol: row["CSOL"]?.trim().toUpperCase() === "TRUE",
      rol: row["ROL"]?.trim().toUpperCase() === "TRUE",
      min_189_points: null, // Will be populated from invitation_rounds later if needed
    });
  }

  // Batch upsert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("occupations").upsert(chunk, {
      onConflict: "anzsco_code",
    });
    if (error) {
      console.error(`Error upserting occupations chunk ${i}:`, error);
      throw error;
    }
  }

  console.log(`Seeded ${rows.length} occupations.`);
  return rows;
}

// ---------------------------------------------------------------------------
// 2. Seed State Nominations
// ---------------------------------------------------------------------------

interface StateNomRow {
  state: string;
  anzsco_code: string;
  occupation_title: string | null;
  visa_190: string;
  visa_491: string;
  notes: string | null;
}

function parseQld(): StateNomRow[] {
  const csvPath = path.join(SEED_DATA_DIR, "states", "qld.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const lines = csvText.split("\n").slice(2); // skip empty row + header
  const rows: StateNomRow[] = [];

  for (const line of lines) {
    const parts = parseCSVLine(line);
    const code = parts[0]?.trim();
    if (!code || !/^\d{6}$/.test(code)) continue;
    const title = parts[1]?.trim() || null;
    const has491 = parts[2]?.trim().toLowerCase() === "yes";
    const has190 = parts[3]?.trim().toLowerCase() === "yes";

    rows.push({
      state: "QLD",
      anzsco_code: code,
      occupation_title: title,
      visa_190: has190 ? "eligible" : "not_eligible",
      visa_491: has491 ? "eligible" : "not_eligible",
      notes: null,
    });
  }
  return rows;
}

function parseAct(): StateNomRow[] {
  const csvPath = path.join(SEED_DATA_DIR, "states", "act.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const lines = csvText.split("\n").slice(2); // skip header rows
  const rows: StateNomRow[] = [];

  for (const line of lines) {
    const parts = parseCSVLine(line);
    const code = parts[2]?.trim();
    const name = parts[3]?.trim() || "";
    if (!code || !/^\d{6}$/.test(code)) continue;

    const is491Only = name.toLowerCase().includes("(491 only)");
    rows.push({
      state: "ACT",
      anzsco_code: code,
      occupation_title: name || null,
      visa_190: is491Only ? "not_eligible" : "eligible",
      visa_491: "eligible",
      notes: is491Only ? "491 Only" : null,
    });
  }
  return rows;
}

function parseNsw(): { rows190UnitGroups: Set<string> } {
  const csvPath = path.join(SEED_DATA_DIR, "states", "nsw.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const lines = csvText.split("\n");

  const nsw190UnitGroups = new Set<string>();
  let inNsw190 = false;

  for (const line of lines) {
    if (line.includes("Skilled Nominated visa (subclass 190)")) {
      inNsw190 = true;
      continue;
    }
    if (
      line.includes("Skilled Work Regional visa (subclass 491)") ||
      line.includes("NSW Regional Skills List")
    ) {
      break;
    }
    if (inNsw190) {
      const match = line.match(/^(\d{4}),/);
      if (match) nsw190UnitGroups.add(match[1]);
    }
  }

  return { rows190UnitGroups: nsw190UnitGroups };
}

function parseTas(): Set<string> {
  const csvPath = path.join(SEED_DATA_DIR, "states", "tas.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const tasCodes = new Set<string>();
  const matches = csvText.match(/\b(\d{6})\b/g);
  if (matches) {
    for (const code of matches) tasCodes.add(code);
  }
  return tasCodes;
}

function parseSa(): Set<string> {
  const csvPath = path.join(SEED_DATA_DIR, "states", "sa.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const saCodes = new Set<string>();
  const matches = csvText.match(/ANZSCO\s+(\d{6})/g);
  if (matches) {
    for (const m of matches) {
      const code = m.match(/(\d{6})/)?.[1];
      if (code) saCodes.add(code);
    }
  }
  return saCodes;
}

function parseWa(): Set<string> {
  const csvPath = path.join(SEED_DATA_DIR, "states", "wa.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const waNormalizedTitles = new Set<string>();
  const lines = csvText.split("\n");

  const sectionHeaderIndices = new Set<number>();
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i + 1]?.trim() === "Occupations") {
      sectionHeaderIndices.add(i);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].replace(/^"|"$/g, "").trim();
    if (!trimmed) continue;
    if (trimmed === "Occupations") continue;
    if (sectionHeaderIndices.has(i)) continue;
    if (
      trimmed.startsWith("General -") ||
      trimmed.includes("WASMOL") ||
      trimmed === "Graduate Occupation List"
    )
      continue;
    const normalized = normTitle(trimmed);
    if (normalized.length > 2) waNormalizedTitles.add(normalized);
  }

  return waNormalizedTitles;
}

async function seedStateNominations(
  occupations: OccupationRow[]
): Promise<number> {
  const allRows: StateNomRow[] = [];

  // QLD: direct ANZSCO code matching with 491/190 columns
  const qldRows = parseQld();
  allRows.push(...qldRows);

  // ACT: all eligible for 491, 190 unless "(491 Only)"
  const actRows = parseAct();
  allRows.push(...actRows);

  // NSW: 4-digit unit group codes for 190, 491 closed
  const { rows190UnitGroups: nsw190UnitGroups } = parseNsw();
  for (const occ of occupations) {
    const unitGroup = occ.anzsco_code.substring(0, 4);
    allRows.push({
      state: "NSW",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: nsw190UnitGroups.has(unitGroup) ? "eligible" : "not_eligible",
      visa_491: "closed",
      notes: null,
    });
  }

  // TAS: all extracted 6-digit codes are eligible for both
  const tasCodes = parseTas();
  for (const occ of occupations) {
    const eligible = tasCodes.has(occ.anzsco_code);
    allRows.push({
      state: "TAS",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: eligible ? "eligible" : "not_eligible",
      visa_491: eligible ? "eligible" : "not_eligible",
      notes: null,
    });
  }

  // SA: all extracted ANZSCO codes eligible for both visas
  const saCodes = parseSa();
  for (const occ of occupations) {
    const eligible = saCodes.has(occ.anzsco_code);
    allRows.push({
      state: "SA",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: eligible ? "eligible" : "not_eligible",
      visa_491: eligible ? "eligible" : "not_eligible",
      notes: null,
    });
  }

  // WA: normalized title matching, no ANZSCO codes in CSV
  const waTitles = parseWa();
  for (const occ of occupations) {
    const normalized = normTitle(occ.title);
    const eligible = waTitles.has(normalized);
    allRows.push({
      state: "WA",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: eligible ? "eligible" : "not_eligible",
      visa_491: eligible ? "eligible" : "not_eligible",
      notes: null,
    });
  }

  // VIC: derived from MLTSSL or STSOL list membership
  for (const occ of occupations) {
    const eligible = occ.mltssl || occ.stsol;
    allRows.push({
      state: "VIC",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: eligible ? "eligible" : "not_eligible",
      visa_491: eligible ? "eligible" : "not_eligible",
      notes: eligible ? "Derived from MLTSSL/STSOL list membership" : null,
    });
  }

  // NT: fully closed for all occupations
  for (const occ of occupations) {
    allRows.push({
      state: "NT",
      anzsco_code: occ.anzsco_code,
      occupation_title: occ.title,
      visa_190: "closed",
      visa_491: "closed",
      notes: "NT nominations currently closed",
    });
  }

  // Clear existing state_nominations and insert
  const { error: deleteError } = await supabase
    .from("state_nominations")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
  if (deleteError) {
    console.error("Error clearing state_nominations:", deleteError);
  }

  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < allRows.length; i += chunkSize) {
    const chunk = allRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("state_nominations").insert(chunk);
    if (error) {
      console.error(
        `Error inserting state_nominations chunk at ${i}:`,
        error
      );
      throw error;
    }
  }

  console.log(`Seeded ${allRows.length} state nomination records.`);

  // Verify MLTSSL coverage
  const mltsslOccupations = occupations.filter((o) => o.mltssl);
  const states = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
  const stateSet = new Set(allRows.map((r) => `${r.state}:${r.anzsco_code}`));
  let missingCount = 0;
  for (const occ of mltsslOccupations) {
    for (const state of states) {
      if (!stateSet.has(`${state}:${occ.anzsco_code}`)) {
        missingCount++;
      }
    }
  }
  if (missingCount > 0) {
    console.warn(
      `WARNING: ${missingCount} missing state nomination records for MLTSSL occupations.`
    );
  } else {
    console.log(
      `Verified: All ${mltsslOccupations.length} MLTSSL occupations have records for all 8 states.`
    );
  }

  return allRows.length;
}

// ---------------------------------------------------------------------------
// 3. Seed Invitation Rounds
// ---------------------------------------------------------------------------

async function seedInvitationRounds(): Promise<number> {
  const csvPath = path.join(SEED_DATA_DIR, "rounds.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  const rows: Array<{
    round_date: string | null;
    visa_subclass: string | null;
    anzsco_code: string | null;
    minimum_points: number | null;
    invitations_issued: number | null;
  }> = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const roundDate = row["round_date"]?.trim() || null;
    const visaSubclass = row["visa_subclass"]?.trim() || null;
    const occupation = row["occupation"]?.trim() || null;
    const minPoints = row["min_points"]?.trim();
    const totalInvited = row["total_invited_round"]?.trim();

    // The rounds.csv uses occupation title, not ANZSCO code.
    // Store occupation title in anzsco_code field for now (will be resolved in seed).
    // Actually, the invitation_rounds table has anzsco_code field, but rounds.csv has occupation names.
    // We store the occupation name and resolve later, or we store it as-is since the schema accepts text.
    rows.push({
      round_date: roundDate,
      visa_subclass: visaSubclass,
      anzsco_code: occupation, // This is actually the occupation title from the CSV
      minimum_points: minPoints ? parseInt(minPoints, 10) : null,
      invitations_issued: totalInvited ? parseInt(totalInvited, 10) : null,
    });
  }

  // Clear and insert
  const { error: deleteError } = await supabase
    .from("invitation_rounds")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("Error clearing invitation_rounds:", deleteError);
  }

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("invitation_rounds").insert(chunk);
    if (error) {
      console.error(
        `Error inserting invitation_rounds chunk at ${i}:`,
        error
      );
      throw error;
    }
  }

  console.log(`Seeded ${rows.length} invitation round records.`);
  return rows.length;
}

// ---------------------------------------------------------------------------
// 4. Seed Assessing Body Requirements (Big 4)
// ---------------------------------------------------------------------------

async function seedAssessingBodyRequirements(): Promise<number> {
  const bodies = [
    {
      body_name: "ACS",
      required_documents: {
        documents: [
          {
            type: "Employment Reference",
            description:
              "Employer reference letter on company letterhead detailing ICT duties, dates, and hours",
            required: true,
          },
          {
            type: "CV/Resume",
            description:
              "Detailed CV showing employment history with ICT focus",
            required: true,
          },
          {
            type: "Statutory Declaration",
            description:
              "Statutory declaration for self-employment or where employer reference is unavailable",
            required: false,
          },
          {
            type: "RPL Report",
            description:
              "Recognition of Prior Learning report for applicants without ICT qualifications (major/minor pathway)",
            required: false,
          },
          {
            type: "Qualification Documents",
            description:
              "Certified copies of degree certificates and transcripts",
            required: true,
          },
        ],
      },
      duty_descriptors: {
        focus: "ICT-specific duties and responsibilities",
        categories: [
          "Software development and programming",
          "Systems analysis and design",
          "Database administration and management",
          "Network engineering and administration",
          "ICT project management",
          "ICT security and cyber security",
          "Web development and multimedia",
          "ICT support and testing",
        ],
        guidance:
          "Duties must clearly demonstrate ICT content at the nominated skill level. ACS assesses the ICT content percentage of each role. At least 65% of duties should be ICT-related for a positive outcome.",
      },
      qualification_requirements: {
        pathways: [
          {
            name: "ICT Major",
            description:
              "Bachelor or higher with ICT major. Requires fewer years of post-qualification experience.",
            experience_required: "2 years closely related, or 4 years related",
          },
          {
            name: "ICT Minor",
            description:
              "Bachelor or higher with ICT minor. Requires more post-qualification experience.",
            experience_required: "5 years closely related, or 6 years related",
          },
          {
            name: "Non-ICT Qualification",
            description:
              "Bachelor or higher in non-ICT field. Assessed via RPL pathway.",
            experience_required:
              "6 years closely related work in nominated occupation",
          },
          {
            name: "No Qualification",
            description: "No tertiary qualification. Assessed via RPL pathway.",
            experience_required:
              "8 years closely related work in nominated occupation",
          },
        ],
      },
      experience_requirements: {
        minimum_years: 2,
        closely_related:
          "Work must be closely related to the nominated ANZSCO occupation",
        recency:
          "Experience should be recent (within last 10 years for best outcomes)",
        deductions:
          "ACS may deduct years for qualification-experience alignment. Typical deduction: 2-4 years.",
      },
      formatting_notes:
        "Employment references must be on company letterhead with ABN/ACN (for Australian employers), include start and end dates (dd/mm/yyyy), hours per week, detailed duties list, and be signed by a direct supervisor or HR manager. Each role should have 6-8 duty statements that are ICT-specific.",
      conversation_template: {
        phases: [
          {
            name: "Introduction",
            prompt:
              "Welcome the user and explain the ACS skill assessment process. Ask which ICT specialization (major or minor) applies to their qualification.",
          },
          {
            name: "Employment History",
            prompt:
              "Gather details about each employment role: company name, job title, dates, hours per week, and whether the role is in Australia or overseas.",
          },
          {
            name: "Duty Gathering",
            prompt:
              "For each role, ask the user to describe their daily tasks and responsibilities in plain language. Focus on ICT-specific duties.",
          },
          {
            name: "Duty Alignment",
            prompt:
              "Rewrite the user's described duties to align with ANZSCO task descriptors for their nominated occupation. Ensure at least 65% ICT content.",
          },
          {
            name: "Document Generation",
            prompt:
              "Generate the employment reference letter, CV, and any required statutory declarations based on the gathered information.",
          },
          {
            name: "Review",
            prompt:
              "Present the generated documents for user review. Ask if any corrections or additions are needed.",
          },
        ],
      },
    },
    {
      body_name: "VETASSESS",
      required_documents: {
        documents: [
          {
            type: "Employment Reference",
            description:
              "Employer reference letter detailing duties aligned to ANZSCO unit group descriptors",
            required: true,
          },
          {
            type: "CV/Resume",
            description:
              "Comprehensive CV showing employment history and qualifications",
            required: true,
          },
          {
            type: "Cover Letter",
            description:
              "Personal statement explaining how qualifications and experience align to the nominated occupation",
            required: true,
          },
          {
            type: "Qualification Documents",
            description:
              "Certified copies of degree certificates, transcripts, and course syllabi",
            required: true,
          },
        ],
      },
      duty_descriptors: {
        focus: "ANZSCO unit group aligned duties and responsibilities",
        categories: [
          "Core tasks from the ANZSCO unit group description",
          "Supervisory or management responsibilities",
          "Technical or professional competencies",
          "Industry-specific knowledge application",
          "Client or stakeholder engagement",
          "Compliance and regulatory awareness",
        ],
        guidance:
          "VETASSESS assesses whether the qualification and employment are highly relevant to the nominated ANZSCO occupation at the required skill level. Duties must map to the ANZSCO unit group task descriptions.",
      },
      qualification_requirements: {
        pathways: [
          {
            name: "Qualification Match",
            description:
              "Qualification must be highly relevant to the nominated occupation at the ANZSCO skill level.",
            experience_required:
              "1 year post-qualification at required skill level",
          },
          {
            name: "Qualification + Additional Experience",
            description:
              "Qualification is relevant but not highly relevant. Additional experience compensates.",
            experience_required:
              "2-3 years post-qualification at required skill level",
          },
        ],
      },
      experience_requirements: {
        minimum_years: 1,
        skill_level_match:
          "Employment must be at the ANZSCO skill level for the nominated occupation",
        recency: "At least 1 year within the last 5 years",
        hours: "Minimum 20 hours per week for paid employment",
      },
      formatting_notes:
        "Employment references should detail specific duties that align with the ANZSCO unit group description. Include exact dates, hours, and salary information where possible. References must be on official letterhead and signed.",
      conversation_template: {
        phases: [
          {
            name: "Introduction",
            prompt:
              "Welcome the user and explain the VETASSESS assessment process. Confirm their nominated ANZSCO occupation and skill level.",
          },
          {
            name: "Qualification Review",
            prompt:
              "Ask about their highest qualification, field of study, and how it relates to the nominated occupation.",
          },
          {
            name: "Employment History",
            prompt:
              "Gather employment details: company name, title, dates, hours, and whether the role was at the required ANZSCO skill level.",
          },
          {
            name: "Duty Gathering",
            prompt:
              "For each relevant role, ask the user to describe their responsibilities. Focus on duties that align with the ANZSCO unit group description.",
          },
          {
            name: "Duty Alignment",
            prompt:
              "Rewrite duties to align with the specific ANZSCO unit group task descriptors for the nominated occupation.",
          },
          {
            name: "Document Generation",
            prompt:
              "Generate the employment reference, CV, and cover letter based on gathered information.",
          },
          {
            name: "Review",
            prompt:
              "Present documents for review and ask for corrections.",
          },
        ],
      },
    },
    {
      body_name: "Engineers Australia",
      required_documents: {
        documents: [
          {
            type: "Competency Demonstration Report (CDR)",
            description:
              "Core document package including Career Episodes, Summary Statement, and CPD",
            required: true,
          },
          {
            type: "Career Episode 1",
            description:
              "Detailed narrative of an engineering project or work episode (1000-2500 words)",
            required: true,
          },
          {
            type: "Career Episode 2",
            description:
              "Second engineering project narrative demonstrating different competencies",
            required: true,
          },
          {
            type: "Career Episode 3",
            description:
              "Third engineering project narrative demonstrating remaining competencies",
            required: true,
          },
          {
            type: "Summary Statement",
            description:
              "Cross-reference document mapping Career Episode paragraphs to competency elements",
            required: true,
          },
          {
            type: "CV/Resume",
            description:
              "Engineering-focused CV with chronological employment and project history",
            required: true,
          },
          {
            type: "Continuing Professional Development (CPD)",
            description:
              "List of professional development activities, conferences, and training",
            required: true,
          },
        ],
      },
      duty_descriptors: {
        focus: "Engineering competency elements mapped to occupational category",
        categories: [
          "Knowledge and Skill Base",
          "Engineering Application Ability",
          "Professional and Personal Attributes",
          "Design and synthesis of engineering solutions",
          "Project management and professional practice",
          "Research and investigation",
        ],
        guidance:
          "Engineers Australia assesses competency against 16 elements grouped into 3 categories. Each Career Episode should demonstrate multiple competency elements. The Summary Statement maps specific paragraphs to elements.",
        competency_elements: {
          knowledge_and_skill_base: [
            "PE1.1 Comprehensive, theory based understanding",
            "PE1.2 Conceptual understanding of mathematics, statistics, computer science",
            "PE1.3 In-depth understanding in specialist discipline",
            "PE1.4 Discernment of knowledge development and research directions",
            "PE1.5 Knowledge of engineering design practice",
            "PE1.6 Understanding of scope, principles and norms of sustainable engineering practice",
          ],
          engineering_application: [
            "PE2.1 Application of established engineering methods",
            "PE2.2 Fluent application of engineering techniques, tools and resources",
            "PE2.3 Application of systematic engineering synthesis and design",
            "PE2.4 Application of systematic approaches to independent conduct of research",
          ],
          professional_attributes: [
            "PE3.1 Ethical conduct and professional accountability",
            "PE3.2 Effective oral and written communication",
            "PE3.3 Creative, innovative and proactive demeanor",
            "PE3.4 Professional use and management of information",
            "PE3.5 Orderly management of self and professional conduct",
            "PE3.6 Effective team membership and leadership",
          ],
        },
      },
      qualification_requirements: {
        pathways: [
          {
            name: "Washington Accord",
            description:
              "4-year engineering degree from a Washington Accord signatory. Assessed as Professional Engineer.",
          },
          {
            name: "Sydney Accord",
            description:
              "3-year engineering technology degree. Assessed as Engineering Technologist.",
          },
          {
            name: "Dublin Accord",
            description:
              "2-year engineering associate degree. Assessed as Engineering Associate.",
          },
          {
            name: "Non-Accord",
            description:
              "Engineering degree from non-signatory institution. Full CDR assessment required.",
          },
        ],
      },
      experience_requirements: {
        minimum_episodes: 3,
        episode_requirements:
          "Each Career Episode must be 1000-2500 words describing a specific engineering project or work activity",
        australian_episode:
          "At least one Career Episode should cover Australian engineering work if applicable",
        recency: "Career Episodes should cover recent work (within last 10 years preferred)",
      },
      formatting_notes:
        "Career Episodes must use numbered paragraphs (e.g., CE1.1, CE1.2). Use first person ('I did', not 'we did'). Each episode must clearly describe YOUR personal engineering contribution. The Summary Statement must cross-reference specific paragraph numbers to competency elements. Total CDR should not exceed 25 pages excluding appendices.",
      conversation_template: {
        phases: [
          {
            name: "Introduction",
            prompt:
              "Welcome the user and explain the Engineers Australia CDR process. Determine their engineering discipline and occupational category (Professional Engineer, Engineering Technologist, or Engineering Associate).",
          },
          {
            name: "Career Episode Planning",
            prompt:
              "Help the user identify 3 suitable engineering projects or work experiences for their Career Episodes. Each should demonstrate different competency elements.",
          },
          {
            name: "Career Episode 1 Drafting",
            prompt:
              "Guide the user through writing Career Episode 1. Ask detailed questions about the project: background, their personal role, engineering methods used, challenges, and outcomes.",
          },
          {
            name: "Career Episode 2 Drafting",
            prompt:
              "Guide Career Episode 2 drafting, focusing on competency elements not well covered in Episode 1.",
          },
          {
            name: "Career Episode 3 Drafting",
            prompt:
              "Guide Career Episode 3 drafting, ensuring remaining competency elements are addressed.",
          },
          {
            name: "Summary Statement",
            prompt:
              "Generate the Summary Statement cross-referencing Career Episode paragraphs to all 16 competency elements.",
          },
          {
            name: "CV and CPD",
            prompt:
              "Generate the engineering-focused CV and CPD list based on gathered information.",
          },
          {
            name: "Review",
            prompt:
              "Present all CDR documents for review. Check competency element coverage completeness.",
          },
        ],
      },
    },
    {
      body_name: "TRA",
      required_documents: {
        documents: [
          {
            type: "Employment Reference",
            description:
              "Employer reference letter detailing trade-specific duties, tools used, and supervision level",
            required: true,
          },
          {
            type: "CV/Resume",
            description:
              "Trade-focused CV showing apprenticeship, employment history, and trade qualifications",
            required: true,
          },
          {
            type: "Trade Qualification Evidence",
            description:
              "Certified copies of trade certificates, licenses, and completion documents",
            required: true,
          },
          {
            type: "Statutory Declaration",
            description:
              "Statutory declaration for self-employment or where employer reference is unavailable",
            required: false,
          },
          {
            type: "Photographic Evidence",
            description:
              "Photos of completed trade work demonstrating skill level (for Technical Interview pathway)",
            required: false,
          },
        ],
      },
      duty_descriptors: {
        focus: "Trade-specific tasks, tools, materials, and techniques",
        categories: [
          "Core trade tasks and operations",
          "Tool and equipment operation and maintenance",
          "Material selection and handling",
          "Safety procedures and compliance",
          "Quality control and inspection",
          "Workplace communication and documentation",
          "Supervision and training of junior workers",
        ],
        guidance:
          "TRA assesses trade skills through documentation review and may require a Job Ready Program (JRP) including a workplace assessment. Duties must demonstrate hands-on trade work at the journeyman/tradesperson level.",
      },
      qualification_requirements: {
        pathways: [
          {
            name: "Offshore Skills Assessment",
            description:
              "For applicants with overseas trade qualifications. Document-based initial assessment.",
          },
          {
            name: "Job Ready Program (JRP)",
            description:
              "Onshore program requiring workplace assessment, employer nomination, and practical demonstration.",
            stages: [
              "Job Ready Employment (JRE)",
              "Job Ready Workplace Assessment (JRWA)",
              "Job Ready Final Assessment (JRFA)",
            ],
          },
        ],
      },
      experience_requirements: {
        minimum_years: 3,
        trade_qualification:
          "Must have completed a formal apprenticeship or trade qualification equivalent to Australian Certificate III",
        practical_hours:
          "Minimum 1,080 hours (approximately 6 months) of supervised trade employment for JRP",
        recency: "Recent trade work experience preferred",
      },
      formatting_notes:
        "Employment references must detail specific trade tasks performed, tools and equipment used, types of materials worked with, and level of supervision. Include the trade license or certificate number where applicable. For construction trades, mention specific building codes and standards followed.",
      conversation_template: {
        phases: [
          {
            name: "Introduction",
            prompt:
              "Welcome the user and explain the TRA assessment process. Determine their specific trade and assessment pathway (Offshore Skills Assessment or Job Ready Program).",
          },
          {
            name: "Trade Qualification",
            prompt:
              "Gather details about their trade qualification: apprenticeship duration, institution, trade certificate type, and any licenses held.",
          },
          {
            name: "Employment History",
            prompt:
              "Collect employment details for each trade role: employer, dates, hours, and country.",
          },
          {
            name: "Trade Duty Gathering",
            prompt:
              "For each role, ask about specific trade tasks performed, tools used, materials worked with, and supervision responsibilities.",
          },
          {
            name: "Duty Alignment",
            prompt:
              "Rewrite trade duties to align with ANZSCO trade occupation descriptors. Ensure duties demonstrate journeyman-level competency.",
          },
          {
            name: "Document Generation",
            prompt:
              "Generate the employment reference, CV, and any statutory declarations based on gathered information.",
          },
          {
            name: "Review",
            prompt:
              "Present documents for review and ask for corrections. Remind about photographic evidence if applicable.",
          },
        ],
      },
    },
  ];

  // Clear and insert
  const { error: deleteError } = await supabase
    .from("assessing_body_requirements")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("Error clearing assessing_body_requirements:", deleteError);
  }

  const { error } = await supabase
    .from("assessing_body_requirements")
    .upsert(bodies, { onConflict: "body_name" });
  if (error) {
    console.error("Error upserting assessing_body_requirements:", error);
    throw error;
  }

  console.log(
    `Seeded ${bodies.length} assessing body requirement records.`
  );
  return bodies.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Starting seed process...\n");

  try {
    // 1. Occupations
    const occupations = await seedOccupations();

    // 2. State Nominations (depends on occupations for NSW/TAS/SA/WA/VIC/NT)
    const stateNomCount = await seedStateNominations(occupations);

    // 3. Invitation Rounds
    const roundsCount = await seedInvitationRounds();

    // 4. Assessing Body Requirements
    const bodyCount = await seedAssessingBodyRequirements();

    // Summary
    console.log("\n--- Seed Summary ---");
    console.log(`Occupations:                ${occupations.length}`);
    console.log(`State Nominations:          ${stateNomCount}`);
    console.log(`Invitation Rounds:          ${roundsCount}`);
    console.log(`Assessing Body Requirements: ${bodyCount}`);
    console.log("--- Done ---");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

main();
