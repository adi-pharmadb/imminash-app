/**
 * Duty alignment engine: parsing document update markers from AI responses.
 *
 * The AI embeds structured updates within its conversational text using:
 * - Document updates: [DOC_UPDATE:document_type]content[/DOC_UPDATE]
 * - ACS form updates: [ACS_UPDATE:section_name]json_content[/ACS_UPDATE]
 * - Employer markers: [EMPLOYER:Company Name] (signals employer discovered)
 *
 * This module extracts those updates and provides clean chat text.
 */

export interface DocumentUpdate {
  documentType: string;
  content: string;
}

export interface ACSFormUpdate {
  section: string;
  content: string;
}

const DOC_UPDATE_REGEX =
  /\[DOC_UPDATE:(\w+)\]\s*([\s\S]*?)\s*\[\/DOC_UPDATE\]/g;

const ACS_UPDATE_REGEX =
  /\[ACS_UPDATE:(\w+)\]\s*([\s\S]*?)\s*\[\/ACS_UPDATE\]/g;

const EMPLOYER_MARKER_REGEX = /\[EMPLOYER:([^\]]+)\]/g;

/**
 * Extract all document update markers from an AI response string.
 * Returns an array of { documentType, content } objects.
 */
export function parseDocumentUpdates(aiResponse: string): DocumentUpdate[] {
  const updates: DocumentUpdate[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(DOC_UPDATE_REGEX.source, DOC_UPDATE_REGEX.flags);
  while ((match = regex.exec(aiResponse)) !== null) {
    updates.push({
      documentType: match[1],
      content: match[2].trim(),
    });
  }

  return updates;
}

/**
 * Extract all ACS form update markers from an AI response string.
 * Returns an array of { section, content } objects where content is JSON.
 */
export function parseACSFormUpdates(aiResponse: string): ACSFormUpdate[] {
  const updates: ACSFormUpdate[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(ACS_UPDATE_REGEX.source, ACS_UPDATE_REGEX.flags);
  while ((match = regex.exec(aiResponse)) !== null) {
    updates.push({
      section: match[1],
      content: match[2].trim(),
    });
  }

  return updates;
}

/**
 * Extract employer names from AI response text.
 * Supports explicit [EMPLOYER:Name] markers and also parses natural language
 * patterns like "your time at [Company]" or "at [Company] from".
 */
export function parseEmployerNames(aiResponse: string): string[] {
  const names: string[] = [];

  // Explicit markers
  const regex = new RegExp(EMPLOYER_MARKER_REGEX.source, EMPLOYER_MARKER_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(aiResponse)) !== null) {
    const name = match[1].trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Extract employer names from an entire conversation history by scanning
 * both AI markers and DOC_UPDATE markers for reference letter types.
 * Returns deduplicated employer names in order of first appearance.
 */
export function extractEmployersFromMessages(
  messages: Array<{ role: string; content: string }>,
): string[] {
  const employers: string[] = [];

  for (const msg of messages) {
    // Check for explicit [EMPLOYER:Name] markers in any message
    const markerNames = parseEmployerNames(msg.content);
    for (const name of markerNames) {
      if (!employers.includes(name)) {
        employers.push(name);
      }
    }

    // Check DOC_UPDATE markers for reference letter doc types
    // e.g. DOC_UPDATE:reference_letter_acme_corp
    if (msg.role === "assistant") {
      const docUpdates = parseDocumentUpdates(msg.content);
      for (const update of docUpdates) {
        if (update.documentType.startsWith("reference_letter_")) {
          const employerSlug = update.documentType.replace("reference_letter_", "");
          const employerName = employerSlug
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          if (!employers.includes(employerName)) {
            employers.push(employerName);
          }
        }
      }
    }
  }

  return employers;
}

/**
 * Remove all document, ACS form, and employer markers from AI text,
 * returning clean chat text.
 */
export function stripDocumentMarkers(aiResponse: string): string {
  return aiResponse
    .replace(
      new RegExp(DOC_UPDATE_REGEX.source, DOC_UPDATE_REGEX.flags),
      "",
    )
    .replace(
      new RegExp(ACS_UPDATE_REGEX.source, ACS_UPDATE_REGEX.flags),
      "",
    )
    .replace(
      new RegExp(EMPLOYER_MARKER_REGEX.source, EMPLOYER_MARKER_REGEX.flags),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
