/**
 * Static DHA processing time estimates and PR timeline data per visa subclass.
 * Sourced from Department of Home Affairs published processing time data.
 */

export interface ProcessingTimeInfo {
  range: string;
  typical: string;
}

export interface TimelineToPR {
  description: string;
  immediacyLabel: string;
}

export interface VisaProcessingData {
  processingTime: ProcessingTimeInfo;
  timelineToPR: TimelineToPR;
}

/** Date when processing time estimates were last verified against DHA data. */
export const LAST_UPDATED = "2026-03-01";

const PROCESSING_DATA: Record<string, VisaProcessingData> = {
  "189": {
    processingTime: { range: "6-12 months", typical: "75% processed within 9 months" },
    timelineToPR: {
      description: "Permanent residency granted immediately on visa grant.",
      immediacyLabel: "Immediate PR",
    },
  },
  "190": {
    processingTime: { range: "6-9 months", typical: "Varies by nominating state" },
    timelineToPR: {
      description: "Permanent residency on grant. Must live in nominating state for 2 years post-grant.",
      immediacyLabel: "PR on grant (2-year state obligation)",
    },
  },
  "491": {
    processingTime: { range: "6-12 months", typical: "75% processed within 10 months" },
    timelineToPR: {
      description: "Provisional visa (5 years). Eligible for 191 PR after 3 years living and working in a regional area.",
      immediacyLabel: "Provisional - PR after 3 years regional",
    },
  },
  "482": {
    processingTime: { range: "1-4 months", typical: "75% processed within 3 months" },
    timelineToPR: {
      description: "Temporary visa. Pathway to 186 PR after 2-3 years with the same employer.",
      immediacyLabel: "Temporary - PR after 2-3 years via 186",
    },
  },
  "494": {
    processingTime: { range: "6-12 months", typical: "75% processed within 9 months" },
    timelineToPR: {
      description: "Provisional visa (5 years). Pathway to 191 PR after 3 years in a regional area with a regional employer.",
      immediacyLabel: "Provisional - PR after 3 years regional",
    },
  },
  "186": {
    processingTime: { range: "6-12 months", typical: "75% processed within 9 months" },
    timelineToPR: {
      description: "Permanent residency granted immediately on visa grant.",
      immediacyLabel: "Immediate PR",
    },
  },
};

/**
 * Get processing time estimate for a visa subclass.
 */
export function getProcessingTime(visa: string): ProcessingTimeInfo {
  return PROCESSING_DATA[visa]?.processingTime ?? { range: "Unknown", typical: "No data available" };
}

/**
 * Get timeline to permanent residency for a visa subclass.
 */
export function getTimelineToPR(visa: string): TimelineToPR {
  return (
    PROCESSING_DATA[visa]?.timelineToPR ?? {
      description: "No timeline data available for this visa subclass.",
      immediacyLabel: "Unknown",
    }
  );
}

/**
 * Get full processing data for a visa subclass.
 */
export function getVisaProcessingData(visa: string): VisaProcessingData | null {
  return PROCESSING_DATA[visa] ?? null;
}
