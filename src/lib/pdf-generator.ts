/**
 * Server-side PDF generation for each document type.
 * Uses @react-pdf/renderer to produce formatted PDF buffers.
 *
 * Supports: Employment Reference, CV/Resume, Cover Letter,
 * Statutory Declaration, Document Checklist, Submission Guide.
 */

import ReactPDF, {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  paragraph: {
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    marginVertical: 10,
  },
});

/**
 * Render a document's JSON content into a PDF buffer.
 */
export async function generatePdf(
  documentType: string,
  title: string | null,
  content: Record<string, unknown> | null,
): Promise<Buffer> {
  const element = buildPdfElement(documentType, title, content);
  const stream = await ReactPDF.renderToStream(element);

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function buildPdfElement(
  documentType: string,
  title: string | null,
  content: Record<string, unknown> | null,
): React.ReactElement<DocumentProps> {
  const displayTitle = title || formatType(documentType);
  const data = content || {};

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, displayTitle),
      React.createElement(View, { style: styles.divider }),
      ...renderContentSections(data),
    ),
  ) as React.ReactElement<DocumentProps>;
}

/**
 * Recursively turn JSON content into React-PDF View/Text elements.
 */
function renderContentSections(
  data: Record<string, unknown>,
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  for (const [key, value] of Object.entries(data)) {
    const label = formatType(key);

    if (Array.isArray(value)) {
      elements.push(
        React.createElement(
          View,
          { key, style: { marginBottom: 8 } },
          React.createElement(Text, { style: styles.sectionTitle }, label),
          ...value.map((item, i) =>
            React.createElement(
              Text,
              { key: `${key}-${i}`, style: styles.listItem },
              `\u2022 ${String(item)}`,
            ),
          ),
        ),
      );
    } else if (typeof value === "object" && value !== null) {
      elements.push(
        React.createElement(
          View,
          { key, style: { marginBottom: 8 } },
          React.createElement(Text, { style: styles.sectionTitle }, label),
          ...renderContentSections(value as Record<string, unknown>),
        ),
      );
    } else {
      elements.push(
        React.createElement(
          View,
          { key, style: styles.row },
          React.createElement(Text, { style: styles.label }, `${label}: `),
          React.createElement(Text, null, String(value ?? "")),
        ),
      );
    }
  }

  return elements;
}

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
