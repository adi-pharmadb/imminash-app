/**
 * Load hand-authored or scraper-produced knowledge.md files from
 * content/knowledge/<Body>.md into assessing_body_requirements + create
 * a promoted revision row in assessing_body_knowledge_revisions.
 *
 * Usage: npx tsx scripts/load-knowledge.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env.
 *
 * The script is idempotent — re-running it does NOT create duplicate
 * revisions if the file content is unchanged. It diffs the new content
 * against the currently-promoted revision and skips writes on no-op.
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
});

interface BodyRow {
  id: string;
  body_name: string;
  knowledge_md: string | null;
  active_revision_id: string | null;
}

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

async function loadOne(filePath: string): Promise<void> {
  const raw = readFileSync(filePath, "utf-8");
  const firstLine = raw.split("\n", 1)[0];
  if (!firstLine.startsWith("# ")) {
    console.error(`[${filePath}] missing H1 on first line; skipping`);
    return;
  }
  // Body name is everything after "# " and before " — " (the schema format
  // "<Body> — Knowledge Base"). Fall back to the whole line if no em dash.
  const afterHash = firstLine.slice(2).trim();
  const bodyName = afterHash.split(" — ")[0].split(" - ")[0].trim();

  const { data: bodyRaw, error: bodyErr } = await supabase
    .from("assessing_body_requirements")
    .select("id, body_name, knowledge_md, active_revision_id")
    .eq("body_name", bodyName)
    .maybeSingle();
  if (bodyErr) {
    console.error(`[${bodyName}] lookup failed:`, bodyErr.message);
    return;
  }
  if (!bodyRaw) {
    console.error(`[${bodyName}] body_name not found in assessing_body_requirements; skipping`);
    return;
  }
  const body = bodyRaw as BodyRow;

  if (body.knowledge_md && md5(body.knowledge_md) === md5(raw)) {
    console.log(`[${bodyName}] up to date, skipping`);
    return;
  }

  // Insert revision, then promote by updating body row.
  const { data: rev, error: revErr } = await supabase
    .from("assessing_body_knowledge_revisions")
    .insert({
      body_id: body.id,
      knowledge_md: raw,
      scraped_at: new Date().toISOString(),
      sources: null,
      diff_summary: body.knowledge_md ? "hand-authored update" : "initial hand-authored revision",
      promoted_at: new Date().toISOString(),
      promoted_by: "scripts/load-knowledge.ts",
    })
    .select("id")
    .single();
  if (revErr || !rev) {
    console.error(`[${bodyName}] revision insert failed:`, revErr?.message);
    return;
  }

  const { error: updErr } = await supabase
    .from("assessing_body_requirements")
    .update({
      knowledge_md: raw,
      knowledge_scraped_at: new Date().toISOString(),
      active_revision_id: rev.id,
    })
    .eq("id", body.id);
  if (updErr) {
    console.error(`[${bodyName}] body update failed:`, updErr.message);
    return;
  }
  console.log(`[${bodyName}] promoted revision ${rev.id} (${raw.length} chars)`);
}

async function main() {
  const dir = join(process.cwd(), "content", "knowledge");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.log("No knowledge files found in content/knowledge/");
    return;
  }
  for (const f of files) {
    await loadOne(join(dir, f));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
