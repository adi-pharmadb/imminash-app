/**
 * Package Cover Sheet PDF generator.
 *
 * Produces a formatted cover sheet PDF containing applicant details,
 * occupation info, and a list of all documents in the package.
 * Uses @react-pdf/renderer for consistent PDF output.
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
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 30,
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#666666",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    width: 140,
    fontSize: 11,
  },
  value: {
    flex: 1,
    fontSize: 11,
  },
  docListItem: {
    flexDirection: "row",
    marginBottom: 5,
    paddingLeft: 8,
  },
  docBullet: {
    width: 16,
    fontSize: 11,
  },
  docName: {
    flex: 1,
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#999999",
  },
});

export interface CoverSheetData {
  applicantName: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingBody: string;
  dateGenerated: string;
  documents: Array<{ name: string; type: string }>;
}

/**
 * Generate a Package Cover Sheet PDF buffer.
 */
export async function generateCoverSheetPdf(
  data: CoverSheetData,
): Promise<Buffer> {
  const element = buildCoverSheetElement(data);
  const stream = await ReactPDF.renderToStream(element);

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function buildCoverSheetElement(
  data: CoverSheetData,
): React.ReactElement<DocumentProps> {
  const {
    applicantName,
    occupationTitle,
    anzscoCode,
    assessingBody,
    dateGenerated,
    documents,
  } = data;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "Package Summary"),
        React.createElement(
          Text,
          { style: styles.subtitle },
          "Skills Assessment Document Package",
        ),
      ),

      React.createElement(View, { style: styles.divider }),

      // Applicant Details section
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Applicant Details",
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Applicant Name:"),
        React.createElement(Text, { style: styles.value }, applicantName),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Occupation Title:"),
        React.createElement(Text, { style: styles.value }, occupationTitle),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "ANZSCO Code:"),
        React.createElement(
          Text,
          { style: styles.value },
          anzscoCode || "Not specified",
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Assessing Body:"),
        React.createElement(
          Text,
          { style: styles.value },
          assessingBody || "Not specified",
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Date Generated:"),
        React.createElement(Text, { style: styles.value }, dateGenerated),
      ),

      React.createElement(View, { style: styles.divider }),

      // Documents in Package section
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `Documents in Package (${documents.length})`,
      ),
      ...documents.map((doc, index) =>
        React.createElement(
          View,
          { key: `doc-${index}`, style: styles.docListItem },
          React.createElement(
            Text,
            { style: styles.docBullet },
            `${index + 1}.`,
          ),
          React.createElement(
            Text,
            { style: styles.docName },
            formatDocName(doc.name),
          ),
        ),
      ),

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Generated by Imminash -- ${dateGenerated}`,
      ),
    ),
  ) as React.ReactElement<DocumentProps>;
}

/**
 * Clean up document name for display on the cover sheet.
 */
function formatDocName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
