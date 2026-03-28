/**
 * Assessment-related TypeScript interfaces for the points calculator,
 * stepper form, occupation matching, and results display.
 */

/** Per-category points breakdown returned by estimatePoints(). */
export interface PointsBreakdown {
  age: number;
  english: number;
  australianExperience: number;
  offshoreExperience: number;
  education: number;
  australianStudy: number;
  regionalStudy: number;
  naatiCcl: number;
  professionalYear: number;
  partner: number;
  total: number;
  items: { label: string; points: number; max: number }[];
}

/** All fields collected across the 7-page stepper flow. */
export interface StepperFormData {
  // Page 1: Basics
  firstName: string;
  age: number;
  visaStatus: string;
  visaExpiry: string;
  // Page 2: Education
  educationLevel: string;
  fieldOfStudy: string;
  universityName: string;
  countryOfEducation: string;
  australianStudy: string;
  regionalStudy: string;
  // Page 3: Additional Qualifications
  additionalDegree: string;
  additionalDegreeField: string;
  additionalDegreeCountry: string;
  // Page 4: Work Experience
  workingSkilled: string;
  jobTitle: string;
  australianExperience: string;
  experience: string; // offshore experience dropdown value
  // Page 5: Role Details
  jobDuties: string;
  // Page 6: English & Languages
  englishScore: string;
  naatiCcl: string;
  // Page 7: Final Details
  professionalYear: string;
  relationshipStatus: string;
  partnerSkills: string;
  partnerStatus: string; // derived from relationshipStatus + partnerSkills
}

/**
 * User profile used by the points calculator.
 * Same shape as StepperFormData but all fields are required strings/numbers.
 */
export interface UserProfile {
  firstName: string;
  age: number;
  visaStatus: string;
  visaExpiry: string;
  educationLevel: string;
  fieldOfStudy: string;
  universityName: string;
  countryOfEducation: string;
  australianStudy: string;
  regionalStudy: string;
  additionalDegree: string;
  additionalDegreeField: string;
  additionalDegreeCountry: string;
  workingSkilled: string;
  jobTitle: string;
  australianExperience: string;
  experience: string;
  jobDuties: string;
  englishScore: string;
  naatiCcl: string;
  professionalYear: string;
  relationshipStatus: string;
  partnerSkills: string;
  partnerStatus: string;
}

/** Latest invitation round data for a matched occupation. */
export interface LatestInvitation {
  round_date: string | null;
  minimum_points: number | null;
  invitations_issued: number | null;
}

/** A single matched occupation returned from the AI matching pipeline. */
export interface MatchResult {
  title: string;
  anzsco_code: string;
  confidence: number;
  reasoning: string;
  experience_aligned: boolean;
  warnings: string[];
  score: number;
  assessing_authority: string | null;
  list: string | null;
  min_189_points: number | null;
  latest_invitation: LatestInvitation | null;
  invitation_rounds?: LatestInvitation[];
}

/** Occupation record matching the occupations database table. */
export interface Occupation {
  id: string;
  anzsco_code: string;
  title: string;
  skill_level: number | null;
  assessing_authority: string | null;
  mltssl: boolean;
  stsol: boolean;
  csol: boolean;
  rol: boolean;
  min_189_points: number | null;
  qualification_level_required: string | null;
  unit_group_description: string | null;
  industry_keywords: string[] | null;
}
