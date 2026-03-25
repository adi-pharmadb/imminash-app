/**
 * Duty alignment engine: parsing document update markers from AI responses.
 *
 * The AI embeds structured updates within its conversational text using:
 * - Document updates: [DOC_UPDATE:document_type]content[/DOC_UPDATE]
 * - ACS form updates: [ACS_UPDATE:section_name]json_content[/ACS_UPDATE]
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
 * Remove all document and ACS form update markers from AI text, returning clean chat text.
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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
