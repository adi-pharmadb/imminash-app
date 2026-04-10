/**
 * Occupation matching logic: AI-powered matching via Anthropic SDK
 * with keyword-based pre-filtering, enhanced ANZSCO validation,
 * confidence scoring, and keyword fallback.
 */

import { z } from "zod";
import type { Occupation, AgentKnowledge } from "@/types/database";

export const matchOccupationsRequestSchema = z.object({
  fieldOfStudy: z.string().min(1).max(200),
  jobTitle: z.string().max(200).default(""),
  jobDuties: z.string().min(50).max(1000),
  additionalFieldOfStudy: z.string().max(200).default(""),
  additionalDegreeLevel: z.string().max(100).default(""),
  additionalDegreeCountry: z.string().max(100).default(""),
  skillsOccupations: z.array(z.string().max(200)).max(1000),
  employerOccupations: z.array(z.string().max(200)).max(1000),
});

export type MatchOccupationsRequest = z.infer<typeof matchOccupationsRequestSchema>;

/** Single AI-returned match with confidence and reasoning. */
export interface AIMatchItem {
  title: string;
  confidence: number;
  reasoning: string;
  experience_alignment: boolean;
  warnings: string[];
}

export interface OccupationMatch {
  title: string;
  confidence: number;
  reasoning: string;
  experience_aligned: boolean;
  warnings: string[];
  score: number;
}

export interface MatchOccupationsResult {
  skillsMatches: OccupationMatch[];
  employerMatches: OccupationMatch[];
}

/** Enriched occupation data passed to the matching pipeline. */
export interface EnrichedOccupation {
  title: string;
  anzsco_code: string;
  unit_group_description: string | null;
  industry_keywords: string[] | null;
  qualification_level_required: string | null;
  mltssl: boolean;
  stsol: boolean;
  csol: boolean;
}

/** Confidence color thresholds using oklch values. */
export function getConfidenceColor(confidence: number): {
  bg: string;
  text: string;
  shadow: string;
} {
  if (confidence >= 70) {
    return {
      bg: "color-mix(in oklch, var(--success) 15%, transparent)",
      text: "var(--success)",
      shadow: "0 0 12px color-mix(in oklch, var(--success) 20%, transparent)",
    };
  }
  if (confidence >= 50) {
    return {
      bg: "oklch(0.78 0.12 70 / 0.15)",
      text: "oklch(0.78 0.12 70)",
      shadow: "none",
    };
  }
  return {
    bg: "oklch(0.65 0.2 25 / 0.15)",
    text: "oklch(0.65 0.2 25)",
    shadow: "none",
  };
}

/** Check if a confidence score indicates a weak match. */
export function isWeakMatch(confidence: number): boolean {
  return confidence < 50;
}

// Tool schema for Anthropic SDK tool use (enhanced with confidence/reasoning)
export const MATCH_OCCUPATIONS_TOOL = {
  name: "return_matched_occupations" as const,
  description: "Return the matched occupation titles in two groups with confidence scores and reasoning",
  input_schema: {
    type: "object" as const,
    properties: {
      skillsMatches: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const, description: "Exact occupation title from the provided list" },
            confidence: { type: "number" as const, description: "Confidence percentage 0-100 of how well this occupation matches" },
            reasoning: { type: "string" as const, description: "2-3 sentence explanation of why this occupation matches the user profile" },
            experience_alignment: { type: "boolean" as const, description: "Whether the user's experience aligns with the ANZSCO duties for this occupation" },
            warnings: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Any concerns like qualification gap, experience mismatch, or other risks",
            },
          },
          required: ["title", "confidence", "reasoning", "experience_alignment", "warnings"],
        },
        description: "Top 5 occupation matches from the MLTSSL/STSOL group, ranked by confidence",
      },
      employerMatches: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const, description: "Exact occupation title from the provided list" },
            confidence: { type: "number" as const, description: "Confidence percentage 0-100 of how well this occupation matches" },
            reasoning: { type: "string" as const, description: "2-3 sentence explanation of why this occupation matches the user profile" },
            experience_alignment: { type: "boolean" as const, description: "Whether the user's experience aligns with the ANZSCO duties for this occupation" },
            warnings: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Any concerns like qualification gap, experience mismatch, or other risks",
            },
          },
          required: ["title", "confidence", "reasoning", "experience_alignment", "warnings"],
        },
        description: "Top 3 occupation matches from the CSOL group, ranked by confidence",
      },
    },
    required: ["skillsMatches", "employerMatches"],
  },
};

// ------------------------------------------------------------------
// Pre-filtering: score occupations by keyword overlap with user profile
// ------------------------------------------------------------------

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/**
 * Pre-filter occupations by keyword overlap with user profile.
 * Returns the top N candidates ranked by relevance score.
 */
export function preFilterOccupations(
  occupations: EnrichedOccupation[],
  fieldOfStudy: string,
  jobTitle: string,
  jobDuties: string,
  additionalFieldOfStudy: string,
  topN: number = 30,
): EnrichedOccupation[] {
  const searchText = normalizeText(
    `${fieldOfStudy} ${jobTitle} ${jobDuties} ${additionalFieldOfStudy}`,
  );
  const searchWords = searchText.split(/\s+/).filter((w) => w.length > 2);

  const scored = occupations.map((occ) => {
    let score = 0;

    // Score against industry keywords
    if (occ.industry_keywords) {
      for (const keyword of occ.industry_keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (searchText.includes(normalizedKeyword)) {
          score += 3;
        }
        // Partial word matching
        const kwWords = normalizedKeyword.split(/\s+/);
        for (const kw of kwWords) {
          if (kw.length > 3 && searchWords.some((sw) => sw.includes(kw) || kw.includes(sw))) {
            score += 1;
          }
        }
      }
    }

    // Score against unit group description
    if (occ.unit_group_description) {
      const descWords = normalizeText(occ.unit_group_description)
        .split(/\s+/)
        .filter((w) => w.length > 3);
      for (const dw of descWords) {
        if (searchWords.some((sw) => sw === dw)) {
          score += 0.5;
        }
      }
    }

    // Score against occupation title
    const titleNorm = normalizeText(occ.title);
    const titleWords = titleNorm.split(/\s+/).filter((w) => w.length > 2);
    for (const tw of titleWords) {
      if (searchWords.some((sw) => sw.includes(tw) || tw.includes(sw))) {
        score += 2;
      }
    }

    // Boost for exact job title match
    const normJob = normalizeText(jobTitle);
    if (normJob && titleNorm.includes(normJob)) {
      score += 10;
    }
    if (normJob && normJob.includes(titleNorm) && titleNorm.length > 3) {
      score += 8;
    }

    return { occ, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((s) => s.occ);
}

// ------------------------------------------------------------------
// Enhanced AI prompt with unit group descriptions and agent knowledge
// ------------------------------------------------------------------

/**
 * Build the enhanced AI prompt including unit group descriptions
 * and agent knowledge for maximum matching accuracy.
 */
export function buildMatchingPrompt(
  input: MatchOccupationsRequest,
  skillsOccupations: EnrichedOccupation[],
  employerOccupations: EnrichedOccupation[],
  agentKnowledge: AgentKnowledge[],
): string {
  const additionalQualSection = input.additionalFieldOfStudy
    ? `\n- Additional Qualification: ${input.additionalDegreeLevel} of ${input.additionalFieldOfStudy} (${input.additionalDegreeCountry || "unknown country"})`
    : "";

  // Build agent knowledge map for quick lookup
  const knowledgeMap = new Map(agentKnowledge.map((k) => [k.anzsco_code, k]));

  // Format occupation entries with descriptions
  const formatOccList = (occs: EnrichedOccupation[]): string => {
    return occs.map((occ) => {
      let entry = `- ${occ.title} (ANZSCO ${occ.anzsco_code})`;
      if (occ.unit_group_description) {
        entry += `\n  ANZSCO Description: ${occ.unit_group_description}`;
      }
      if (occ.qualification_level_required) {
        entry += `\n  Qualification Required: ${occ.qualification_level_required}`;
      }
      const knowledge = knowledgeMap.get(occ.anzsco_code);
      if (knowledge) {
        if (knowledge.strategic_advice) {
          entry += `\n  Agent Note: ${knowledge.strategic_advice}`;
        }
        if (knowledge.common_pitfalls) {
          entry += `\n  Common Pitfall: ${knowledge.common_pitfalls}`;
        }
      }
      return entry;
    }).join("\n");
  };

  return `You are an expert Australian immigration occupation matching consultant with deep knowledge of ANZSCO occupation classifications. Your task is to match a user's profile to the most relevant ANZSCO occupations with HIGH ACCURACY.

CRITICAL INSTRUCTIONS:
- Match based on the user's ACTUAL duties, qualifications, and experience
- Compare the user's job duties against each occupation's official ANZSCO unit group description
- Return a confidence percentage (0-100) reflecting how well the user's profile matches each occupation
- Provide clear reasoning explaining WHY each occupation matches
- Flag any warnings about qualification gaps, experience mismatches, or alignment issues
- Consider both primary and additional qualifications
- Be honest about weak matches -- do not inflate confidence scores

USER PROFILE:
- Primary Field of Study: ${input.fieldOfStudy}
- Job Title: ${input.jobTitle}
- Job Duties: ${input.jobDuties}${additionalQualSection}

GROUP 1 - SKILLS ASSESSMENT OCCUPATIONS (MLTSSL/STSOL - for 189/190/491 visa pathways):
Select the top 5 most relevant from this pre-filtered list:
${formatOccList(skillsOccupations)}

GROUP 2 - EMPLOYER SPONSORED OCCUPATIONS (CSOL - for 482/494 visa pathways):
Select the top 3 most relevant from this pre-filtered list:
${formatOccList(employerOccupations)}

For each match, provide:
1. The EXACT occupation title from the list (e.g. "Software Engineer" NOT "Software Engineer (ANZSCO 261313)"). Do NOT append ANZSCO codes to the title.
2. A confidence percentage (0-100)
3. A 2-3 sentence reasoning explaining why this matches
4. Whether the user's experience aligns with the ANZSCO duties (true/false)
5. Any warnings or concerns as an array of strings

IMPORTANT: The "title" field must contain ONLY the occupation name exactly as it appears before the parentheses in the list above. Do not include ANZSCO codes in the title field.

Return the matched occupations using the provided tool.`;
}

/**
 * Call Anthropic SDK to get AI-matched occupations using tool use.
 */
export async function aiMatchOccupations(
  input: MatchOccupationsRequest,
  skillsOccupations: EnrichedOccupation[],
  employerOccupations: EnrichedOccupation[],
  agentKnowledge: AgentKnowledge[],
  anthropicClient: { messages: { create: (params: any) => Promise<any> } },
  model: string,
): Promise<{ skillsMatches: AIMatchItem[]; employerMatches: AIMatchItem[] } | null> {
  try {
    const prompt = buildMatchingPrompt(input, skillsOccupations, employerOccupations, agentKnowledge);

    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      tools: [MATCH_OCCUPATIONS_TOOL],
      tool_choice: { type: "tool" as const, name: "return_matched_occupations" },
    });

    const toolUseBlock = response.content.find(
      (block: any) => block.type === "tool_use",
    );

    if (!toolUseBlock?.input) {
      return null;
    }

    const result = toolUseBlock.input as {
      skillsMatches?: AIMatchItem[];
      employerMatches?: AIMatchItem[];
    };

    const parseItems = (items: unknown): AIMatchItem[] => {
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => ({
        title: String(item.title ?? ""),
        confidence: Number(item.confidence ?? 0),
        reasoning: String(item.reasoning ?? ""),
        experience_alignment: Boolean(item.experience_alignment),
        warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : [],
      }));
    };

    return {
      skillsMatches: parseItems(result.skillsMatches),
      employerMatches: parseItems(result.employerMatches),
    };
  } catch (error) {
    console.error("AI matching failed:", error);
    return null;
  }
}

/**
 * Strip ANZSCO code suffixes that the AI sometimes appends.
 * e.g. "ICT Business Analyst (ANZSCO 261111)" -> "ICT Business Analyst"
 */
function stripAnzscoSuffix(title: string): string {
  return title.replace(/\s*\(ANZSCO\s*\d+\)\s*$/i, "").trim();
}

/**
 * Validate AI-returned titles against canonical occupation list.
 * Case-insensitive match; strips ANZSCO suffixes; filters out hallucinated titles.
 */
export function validateAgainstCanonical(
  items: AIMatchItem[],
  canonicalTitles: string[],
): AIMatchItem[] {
  const canonicalSet = new Set(
    canonicalTitles.map((t) => t.toLowerCase().trim()),
  );
  return items
    .map((item) => ({
      ...item,
      title: stripAnzscoSuffix(item.title),
    }))
    .filter((item) =>
      canonicalSet.has(item.title.toLowerCase().trim()),
    );
}

// ------------------------------------------------------------------
// Keyword fallback matching (ported from legacy occupationData.ts)
// ------------------------------------------------------------------

function generateKeywords(title: string): string[] {
  const norm = title
    .toLowerCase()
    .replace(/[()]/g, "")
    .trim();
  const words = norm.split(/[\s,/\\-]+/).filter((w) => w.length > 2);
  const keywords = [norm, ...words];

  // Add bigrams
  for (let i = 0; i < words.length - 1; i++) {
    keywords.push(`${words[i]} ${words[i + 1]}`);
  }

  return [...new Set(keywords)];
}

/**
 * Keyword-based fallback matching using bigram scoring.
 * Returns matches with estimated confidence scores.
 */
export function keywordMatchOccupations(
  fieldOfStudy: string,
  jobTitle: string,
  jobDuties: string,
  additionalFieldOfStudy: string,
  occupationTitles: string[],
  isWorking: boolean,
  topN: number,
): OccupationMatch[] {
  const searchTerms = normalizeText(
    `${fieldOfStudy} ${jobTitle} ${jobDuties} ${additionalFieldOfStudy}`,
  );

  const scored = occupationTitles.map((title) => {
    let score = 0;
    const keywords = generateKeywords(title);

    for (const keyword of keywords) {
      if (searchTerms.includes(keyword)) {
        score += keyword.split(" ").length > 1 ? 3 : 1;
      }
    }

    // Boost if job title closely matches occupation title
    const normTitle = normalizeText(title).split("(")[0].trim();
    const normJob = normalizeText(jobTitle);
    if (normJob && normJob.includes(normTitle)) {
      score += 5;
    }
    if (normJob && normTitle.includes(normJob) && normJob.length > 3) {
      score += 4;
    }

    // Working boost
    if (isWorking) score += 1;

    return { title, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topN);

  // Fill to topN if fewer matched
  while (top.length < topN && scored.length > top.length) {
    top.push(scored[top.length]);
  }

  // Convert keyword scores to estimated confidence (rough mapping)
  return top.slice(0, topN).map((item) => {
    const confidence = Math.min(95, Math.max(20, item.score * 8));
    return {
      title: item.title,
      score: item.score,
      confidence,
      reasoning: "Matched via keyword analysis based on your field of study, job title, and duties.",
      experience_aligned: item.score >= 4,
      warnings: item.score < 2 ? ["Low keyword overlap with your profile"] : [],
    };
  });
}

/**
 * Full matching pipeline: pre-filter -> AI match -> validate -> fallback.
 * Returns top 3 skills + top 2 employer matches with confidence scoring.
 */
export async function matchOccupations(
  input: MatchOccupationsRequest,
  canonicalTitles: string[],
  enrichedOccupations: EnrichedOccupation[],
  agentKnowledge: AgentKnowledge[],
  anthropicClient: { messages: { create: (params: any) => Promise<any> } } | null,
  model: string,
): Promise<MatchOccupationsResult> {
  const allSkillsTitles = enrichedOccupations
    .filter((o) => o.mltssl || o.stsol)
    .map((o) => o.title);
  const allEmployerTitles = enrichedOccupations
    .filter((o) => o.csol)
    .map((o) => o.title);
  const isWorking = !!(input.jobTitle && input.jobTitle.trim());

  // Keyword fallback helper - always returns results if occupations exist
  const getKeywordFallback = (): MatchOccupationsResult => ({
    skillsMatches: keywordMatchOccupations(
      input.fieldOfStudy, input.jobTitle, input.jobDuties,
      input.additionalFieldOfStudy, allSkillsTitles, isWorking, 3,
    ),
    employerMatches: keywordMatchOccupations(
      input.fieldOfStudy, input.jobTitle, input.jobDuties,
      input.additionalFieldOfStudy, allEmployerTitles, isWorking, 2,
    ),
  });

  try {
    return await matchOccupationsInner();
  } catch (error) {
    console.error("matchOccupations error, falling back to keyword matching:", error);
    return getKeywordFallback();
  }

  async function matchOccupationsInner(): Promise<MatchOccupationsResult> {

  // Phase 1: Pre-filter occupations by keyword relevance
  const skillsEnriched = enrichedOccupations.filter((o) => o.mltssl || o.stsol);
  const employerEnriched = enrichedOccupations.filter((o) => o.csol);

  const preFilteredSkills = preFilterOccupations(
    skillsEnriched,
    input.fieldOfStudy,
    input.jobTitle,
    input.jobDuties,
    input.additionalFieldOfStudy,
    30,
  );
  const preFilteredEmployer = preFilterOccupations(
    employerEnriched,
    input.fieldOfStudy,
    input.jobTitle,
    input.jobDuties,
    input.additionalFieldOfStudy,
    30,
  );

  // Phase 2: AI matching with enhanced prompt
  if (anthropicClient) {
    const aiResult = await aiMatchOccupations(
      input,
      preFilteredSkills,
      preFilteredEmployer,
      agentKnowledge,
      anthropicClient,
      model,
    );

    if (aiResult) {
      const validSkills = validateAgainstCanonical(
        aiResult.skillsMatches,
        canonicalTitles,
      );
      const validEmployer = validateAgainstCanonical(
        aiResult.employerMatches,
        canonicalTitles,
      );

      if (validSkills.length >= 1 || validEmployer.length >= 1) {
        const skillsMatches: OccupationMatch[] = validSkills.slice(0, 3).map((item) => ({
          title: item.title,
          confidence: item.confidence,
          reasoning: item.reasoning,
          experience_aligned: item.experience_alignment,
          warnings: item.warnings,
          score: item.confidence,
        }));

        const employerMatches: OccupationMatch[] = validEmployer.slice(0, 2).map((item) => ({
          title: item.title,
          confidence: item.confidence,
          reasoning: item.reasoning,
          experience_aligned: item.experience_alignment,
          warnings: item.warnings,
          score: item.confidence,
        }));

        // Fill with keyword fallback if AI returned fewer than needed
        if (skillsMatches.length < 3) {
          const fallback = keywordMatchOccupations(
            input.fieldOfStudy,
            input.jobTitle,
            input.jobDuties,
            input.additionalFieldOfStudy,
            allSkillsTitles,
            isWorking,
            3 - skillsMatches.length,
          );
          skillsMatches.push(...fallback);
        }

        if (employerMatches.length < 2) {
          const fallback = keywordMatchOccupations(
            input.fieldOfStudy,
            input.jobTitle,
            input.jobDuties,
            input.additionalFieldOfStudy,
            allEmployerTitles,
            isWorking,
            2 - employerMatches.length,
          );
          employerMatches.push(...fallback);
        }

        return { skillsMatches, employerMatches };
      }
    }
  }

  // Keyword fallback
  return getKeywordFallback();
  } // end matchOccupationsInner
}
