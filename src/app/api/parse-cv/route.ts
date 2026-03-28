/**
 * POST /api/parse-cv
 *
 * Accepts a PDF or DOCX CV upload. Parses the file to extract employment
 * history, qualifications, and other relevant data for the workspace AI.
 * DocGen Brief 5.1
 *
 * For now, returns a stub response acknowledging receipt.
 * Full parsing (PDF text extraction, employer detection) to be implemented
 * when a PDF parsing library is added.
 */

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Please upload a PDF or DOCX." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // TODO: Implement full CV parsing with pdf-parse or similar
    // For now, acknowledge receipt and let the AI conversation handle follow-ups

    return new Response(
      JSON.stringify({
        success: true,
        filename: file.name,
        size: file.size,
        summary:
          `Thanks for uploading **${file.name}**. I've received your CV.\n\n` +
          `Let me now ask you about your employment history in detail. ` +
          `For your **most recent employer**, please confirm:\n\n` +
          `1. Company name\n` +
          `2. Your exact job title\n` +
          `3. Start and end dates\n` +
          `4. Was this role full-time (35+ hours per week)?`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("parse-cv error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process CV" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
