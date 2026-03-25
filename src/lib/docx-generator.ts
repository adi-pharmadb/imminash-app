/**
 * Server-side DOCX generation for each document type.
 * Uses the `docx` npm package to produce formatted .docx buffers.
 *
 * Supports: Employment Reference, CV/Resume, Cover Letter,
 * Statutory Declaration, Document Checklist, Submission Guide.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

/**
 * Generate a DOCX buffer from a document's JSON content.
 */
export async function generateDocx(
  documentType: string,
  title: string | null,
  content: Record<string, unknown> | null,
): Promise<Buffer> {
  const displayTitle = title || formatType(documentType);
  const data = content || {};

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: displayTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  );

  // Horizontal rule
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { color: "cccccc", space: 1, style: "single", size: 6 },
      },
    }),
  );

  // Content sections
  children.push(...buildContentParagraphs(data));

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Recursively turn JSON content into docx Paragraph elements.
 */
function buildContentParagraphs(
  data: Record<string, unknown>,
  headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const [key, value] of Object.entries(data)) {
    const label = formatType(key);

    if (Array.isArray(value)) {
      paragraphs.push(
        new Paragraph({
          text: label,
          heading: headingLevel,
          spacing: { before: 200, after: 100 },
        }),
      );
      for (const item of value) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: String(item) })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          }),
        );
      }
    } else if (typeof value === "object" && value !== null) {
      paragraphs.push(
        new Paragraph({
          text: label,
          heading: headingLevel,
          spacing: { before: 200, after: 100 },
        }),
      );
      paragraphs.push(
        ...buildContentParagraphs(
          value as Record<string, unknown>,
          HeadingLevel.HEADING_3,
        ),
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun({ text: String(value ?? "") }),
          ],
          spacing: { after: 80 },
        }),
      );
    }
  }

  return paragraphs;
}

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
