/**
 * Database schema and seed data validation tests.
 *
 * These tests validate:
 * - Migration SQL files contain correct table definitions
 * - TypeScript types match expected shapes
 * - Seed data CSV parsing produces correct row counts
 * - Foreign key relationships are defined
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type {
  Occupation,
  Lead,
  Assessment,
  StateNomination,
} from "@/types/database";

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../../supabase/migrations"
);
const SEED_DATA_DIR = path.resolve(
  __dirname,
  "../../supabase/seed-data"
);

function readMigration(filename: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf-8");
}

describe("Database Schema and Seed Data", () => {
  it("occupations table migration has all required fields and indexes", () => {
    const sql = readMigration("20260318000003_create_occupations.sql");

    // Required columns
    expect(sql).toContain("id uuid primary key");
    expect(sql).toContain("anzsco_code text not null");
    expect(sql).toContain("title text not null");
    expect(sql).toContain("skill_level integer");
    expect(sql).toContain("assessing_authority text");
    expect(sql).toContain("mltssl boolean");
    expect(sql).toContain("stsol boolean");
    expect(sql).toContain("csol boolean");
    expect(sql).toContain("rol boolean");
    expect(sql).toContain("min_189_points integer");
    expect(sql).toContain("created_at timestamptz");
    expect(sql).toContain("updated_at timestamptz");

    // Indexes
    expect(sql).toContain("unique index");
    expect(sql).toContain("idx_occupations_anzsco_code");
    expect(sql).toContain("idx_occupations_title");
    expect(sql).toContain("idx_occupations_assessing_authority");

    // A valid Occupation row shape should be accepted by the type
    const validRow: Occupation = {
      id: "test-uuid",
      anzsco_code: "261313",
      title: "Software Engineer",
      skill_level: 1,
      assessing_authority: "ACS",
      mltssl: true,
      stsol: false,
      csol: true,
      rol: false,
      min_189_points: 85,
      qualification_level_required: "Bachelor degree or higher",
      unit_group_description: "Software and Applications Programmers",
      industry_keywords: ["software", "programming"],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(validRow.anzsco_code).toBe("261313");
    expect(validRow.mltssl).toBe(true);
  });

  it("leads table migration has required fields and email index", () => {
    const sql = readMigration("20260318000001_create_leads.sql");

    expect(sql).toContain("id uuid primary key");
    expect(sql).toContain("email text not null");
    expect(sql).toContain("first_name text");
    expect(sql).toContain("visa_status text");
    expect(sql).toContain("job_title text");
    expect(sql).toContain("created_at timestamptz");
    expect(sql).toContain("idx_leads_email");

    const validLead: Lead = {
      id: "test-uuid",
      email: "test@example.com",
      first_name: "Jane",
      visa_status: "500",
      job_title: "Developer",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(validLead.email).toBe("test@example.com");
  });

  it("assessments table accepts null user_id and has jsonb fields", () => {
    const sql = readMigration("20260318000006_create_assessments.sql");

    expect(sql).toContain("user_id uuid");
    expect(sql).toContain("nullable");
    expect(sql).toContain("lead_id uuid");
    expect(sql).toContain("references public.leads");
    expect(sql).toContain("profile_data jsonb not null");
    expect(sql).toContain("points_breakdown jsonb not null");
    expect(sql).toContain("total_points integer not null");
    expect(sql).toContain("matched_occupations jsonb not null");

    // Anonymous user assessment with null user_id
    const anonAssessment: Assessment = {
      id: "test-uuid",
      user_id: null,
      lead_id: "lead-uuid",
      profile_data: { age: 28, fieldOfStudy: "Computer Science" },
      points_breakdown: { age: 30, english: 20 },
      total_points: 85,
      matched_occupations: { skills: [], employer: [] },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(anonAssessment.user_id).toBeNull();
  });

  it("state_nominations table has required fields and composite index", () => {
    const sql = readMigration(
      "20260318000004_create_state_nominations.sql"
    );

    expect(sql).toContain("state text not null");
    expect(sql).toContain("anzsco_code text not null");
    expect(sql).toContain("occupation_title text");
    expect(sql).toContain("visa_190 text");
    expect(sql).toContain("visa_491 text");
    expect(sql).toContain("notes text");
    expect(sql).toContain("idx_state_nominations_state_anzsco");
    expect(sql).toContain("(state, anzsco_code)");

    const validNom: StateNomination = {
      id: "test-uuid",
      state: "NSW",
      anzsco_code: "261313",
      occupation_title: "Software Engineer",
      visa_190: "eligible",
      visa_491: "closed",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(validNom.state).toBe("NSW");
    expect(validNom.visa_491).toBe("closed");
  });

  it("assessments.lead_id foreign key references leads.id", () => {
    const sql = readMigration("20260318000006_create_assessments.sql");
    expect(sql).toContain("references public.leads");
    expect(sql).toContain("lead_id uuid");

    // Also verify user_id references auth.users
    expect(sql).toContain("references auth.users");
  });

  it("occupation seed CSV produces ~574 rows matching legacy data [AC-DB1]", () => {
    const csvPath = path.join(SEED_DATA_DIR, "occupations.csv");
    const csvText = fs.readFileSync(csvPath, "utf-8");
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    // Filter out rows without valid ANZSCO codes
    const validRows = (parsed.data as Record<string, string>[]).filter(
      (row) => {
        const code = row["ANZSCO_Code"]?.trim();
        const title = row["Occupation_Title"]?.trim();
        return code && title;
      }
    );

    // Legacy CSV has 574 data rows (575 lines - 1 header)
    expect(validRows.length).toBeGreaterThanOrEqual(570);
    expect(validRows.length).toBeLessThanOrEqual(580);

    // Verify a known occupation exists
    const softwareEngineer = validRows.find(
      (r) => r["ANZSCO_Code"]?.trim() === "261313"
    );
    expect(softwareEngineer).toBeDefined();
    expect(softwareEngineer!["Occupation_Title"]?.trim()).toBe(
      "Software Engineer"
    );
    expect(softwareEngineer!["MLTSSL"]?.trim()).toBe("TRUE");

    // Verify MLTSSL boolean parsing
    const mltsslCount = validRows.filter(
      (r) => r["MLTSSL"]?.trim().toUpperCase() === "TRUE"
    ).length;
    expect(mltsslCount).toBeGreaterThan(50); // Many MLTSSL occupations exist
  });
});
