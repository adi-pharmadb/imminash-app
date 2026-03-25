/**
 * Types for the ACS (Australian Computer Society) skill assessment
 * application form. Mirrors the real ACS portal sections.
 */

export interface ACSPersonalDetails {
  title?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  countryOfBirth?: string;
  citizenship?: string;
  email?: string;
  phone?: string;
  address?: string;
  passportNumber?: string;
  passportCountry?: string;
}

export interface ACSAnzscoCode {
  code?: string;
  title?: string;
  specialisation?: string;
  assessmentPathway?: string; // "ACS Major", "ACS Minor", "RPL", "Post Australian Study"
  pathwayReason?: string;
}

export interface ACSUploadItem {
  documentName: string;
  status: "pending" | "ready" | "uploaded";
  notes?: string;
}

export interface ACSUploadHistory {
  items: ACSUploadItem[];
}

export interface ACSQualificationEntry {
  qualificationTitle?: string;
  fieldOfStudy?: string;
  institution?: string;
  country?: string;
  startDate?: string;
  completionDate?: string;
  ictContent?: string; // "Major (65%+)" | "Minor (20-65%)" | "Non-ICT"
  aqfLevel?: string;
  notes?: string;
}

export interface ACSQualifications {
  entries: ACSQualificationEntry[];
}

export interface ACSEmploymentEntry {
  employer?: string;
  jobTitle?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  isCurrentRole?: boolean;
  weeklyHours?: string;
  ictRelated?: boolean;
  duties?: string[];
  alignedDuties?: string[]; // ANZSCO-aligned version
}

export interface ACSEmployment {
  entries: ACSEmploymentEntry[];
}

export interface ACSSummary {
  totalIctYears?: number;
  relevantIctYears?: number;
  qualificationSuitability?: string;
  assessmentOutlook?: string;
  recommendations?: string[];
  readyToSubmit?: boolean;
}

export interface ACSApplicationData {
  personalDetails: ACSPersonalDetails;
  anzscoCode: ACSAnzscoCode;
  uploadHistory: ACSUploadHistory;
  qualifications: ACSQualifications;
  employment: ACSEmployment;
  summary: ACSSummary;
}

export type ACSSection =
  | "personal_details"
  | "anzsco_code"
  | "upload_history"
  | "qualifications"
  | "employment"
  | "summary";

export const ACS_SECTIONS: { key: ACSSection; label: string }[] = [
  { key: "personal_details", label: "Personal Details" },
  { key: "anzsco_code", label: "ANZSCO Code" },
  { key: "upload_history", label: "Upload History" },
  { key: "qualifications", label: "Qualifications" },
  { key: "employment", label: "Employment" },
  { key: "summary", label: "Summary" },
];

export function createEmptyACSApplication(): ACSApplicationData {
  return {
    personalDetails: {},
    anzscoCode: {},
    uploadHistory: { items: [] },
    qualifications: { entries: [] },
    employment: { entries: [] },
    summary: {},
  };
}
