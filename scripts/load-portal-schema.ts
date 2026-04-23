/**
 * Load hand-authored portal-schema YAMLs from
 * content/portal-schemas/<Body>.yaml into
 * assessing_body_requirements.portal_schema.
 *
 * Usage: npx tsx scripts/load-portal-schema.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env.
 *
 * Idempotent. Uses md5 of the YAML file contents to detect no-op
 * re-runs and skip the DB write.
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { parse as parseYaml } from "yaml";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
});

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

async function loadOne(filePath: string): Promise<void> {
  const raw = readFileSync(filePath, "utf-8");
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(raw) as Record<string, unknown>;
  } catch (err) {
    console.error(`[${filePath}] YAML parse failed:`, err);
    return;
  }
  const bodyName = parsed?.body;
  if (typeof bodyName !== "string") {
    console.error(`[${filePath}] missing or invalid 'body' field; skipping`);
    return;
  }

  const { data: bodyRow, error: bodyErr } = await supabase
    .from("assessing_body_requirements")
    .select("id, portal_schema")
    .eq("body_name", bodyName)
    .maybeSingle();
  if (bodyErr) {
    console.error(`[${bodyName}] lookup failed:`, bodyErr.message);
    return;
  }
  if (!bodyRow) {
    console.error(`[${bodyName}] body not found; skipping`);
    return;
  }

  const existing = bodyRow.portal_schema ?? null;
  if (existing && md5(JSON.stringify(existing)) === md5(JSON.stringify(parsed))) {
    console.log(`[${bodyName}] portal schema unchanged, skipping`);
    return;
  }

  const { error: updErr } = await supabase
    .from("assessing_body_requirements")
    .update({
      portal_schema: parsed,
      portal_schema_captured_at: new Date().toISOString(),
    })
    .eq("id", bodyRow.id);
  if (updErr) {
    console.error(`[${bodyName}] update failed:`, updErr.message);
    return;
  }
  console.log(`[${bodyName}] portal schema loaded (${JSON.stringify(parsed).length} chars)`);
}

async function main() {
  const dir = join(process.cwd(), "content", "portal-schemas");
  const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));
  if (files.length === 0) {
    console.log("No portal schemas found in content/portal-schemas/");
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
