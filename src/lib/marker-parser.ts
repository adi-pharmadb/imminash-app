/**
 * Parse inline marker tags emitted by the unified chat assistant.
 *
 * Grammar:
 *   [PROFILE_UPDATE]{json}[/PROFILE_UPDATE]
 *   [POINTS_UPDATE]{json}[/POINTS_UPDATE]
 *   [MATCH_UPDATE]{json}[/MATCH_UPDATE]
 *   [PAYWALL]                                     (inline, no body)
 *   [CALENDLY]                                    (inline, no body)
 *   [DOC_UPDATE:employment_reference:<employer>]{json}[/DOC_UPDATE]
 */

export interface DocUpdate {
  type: string;
  employer?: string;
  content: unknown;
}

export interface AskChoice {
  options: string[];
  multi?: boolean;
}

export type AskFormField =
  | {
      key: string;
      type: "choice";
      label: string;
      options: string[];
      required?: boolean;
    }
  | {
      key: string;
      type: "number";
      label: string;
      min?: number;
      max?: number;
      step?: number;
      required?: boolean;
    }
  | {
      key: string;
      type: "text";
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      key: string;
      type: "date";
      label: string;
      required?: boolean;
    };

export interface AskForm {
  fields: AskFormField[];
  submitLabel?: string;
}

export interface AskFile {
  accept?: string;
  label?: string;
  purpose?: string;
}

export interface ParsedMarkers {
  profileUpdates: Record<string, unknown>[];
  pointsUpdate: Record<string, unknown> | null;
  matchUpdate: Record<string, unknown> | null;
  hasPaywall: boolean;
  hasCalendly: boolean;
  docUpdates: DocUpdate[];
  askChoice: AskChoice | null;
  askForm: AskForm | null;
  askFile: AskFile | null;
  cleanText: string;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

function collectBlock(
  text: string,
  tag: string,
): { bodies: string[]; stripped: string } {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "g");
  const bodies: string[] = [];
  const stripped = text.replace(re, (_m, body) => {
    bodies.push(body);
    return "";
  });
  return { bodies, stripped };
}

/**
 * Stream-safe marker strip for in-flight text. Hides any unclosed marker
 * opening (and everything after it) so the user never sees raw marker JSON
 * flash by while the model is mid-emit. Use only for rendering the live
 * streaming bubble; for final persistence use parseMarkers.
 */
export function stripInFlightMarkers(text: string): string {
  // First run the full parser to strip completed markers.
  const cleaned = parseMarkers(text).cleanText;
  // Then drop anything from an unclosed opening tag onward.
  const trimmed = cleaned.replace(/\[(PROFILE_UPDATE|POINTS_UPDATE|MATCH_UPDATE|DOC_UPDATE(?::[^\]]*)?|ASK_CHOICE|ASK_FORM|ASK_FILE)\][\s\S]*$/, "");
  return trimmed;
}

export function parseMarkers(text: string): ParsedMarkers {
  let working = text;

  const profileUpdates: Record<string, unknown>[] = [];
  const docUpdates: DocUpdate[] = [];
  let pointsUpdate: Record<string, unknown> | null = null;
  let matchUpdate: Record<string, unknown> | null = null;
  let askChoice: AskChoice | null = null;
  let askForm: AskForm | null = null;
  let askFile: AskFile | null = null;

  // PROFILE_UPDATE
  {
    const { bodies, stripped } = collectBlock(working, "PROFILE_UPDATE");
    working = stripped;
    for (const b of bodies) {
      const parsed = safeJson(b);
      if (parsed && typeof parsed === "object") {
        profileUpdates.push(parsed as Record<string, unknown>);
      }
    }
  }

  // POINTS_UPDATE (last one wins)
  {
    const { bodies, stripped } = collectBlock(working, "POINTS_UPDATE");
    working = stripped;
    for (const b of bodies) {
      const parsed = safeJson(b);
      if (parsed && typeof parsed === "object") {
        pointsUpdate = parsed as Record<string, unknown>;
      }
    }
  }

  // MATCH_UPDATE (last one wins)
  {
    const { bodies, stripped } = collectBlock(working, "MATCH_UPDATE");
    working = stripped;
    for (const b of bodies) {
      const parsed = safeJson(b);
      if (parsed && typeof parsed === "object") {
        matchUpdate = parsed as Record<string, unknown>;
      }
    }
  }

  // DOC_UPDATE with optional subtype + employer
  {
    const re =
      /\[DOC_UPDATE:([a-zA-Z_]+)(?::([^\]]+))?\]([\s\S]*?)\[\/DOC_UPDATE\]/g;
    working = working.replace(re, (_m, type: string, employer: string | undefined, body: string) => {
      const parsed = safeJson(body);
      docUpdates.push({
        type,
        employer: employer?.trim() || undefined,
        content: parsed ?? body.trim(),
      });
      return "";
    });
  }

  // ASK_CHOICE (last one wins — only one choice picker per response)
  {
    const { bodies, stripped } = collectBlock(working, "ASK_CHOICE");
    working = stripped;
    for (const b of bodies) {
      const parsed = safeJson(b);
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { options?: unknown }).options)
      ) {
        const p = parsed as { options: unknown[]; multi?: unknown };
        const options = p.options.filter((o): o is string => typeof o === "string");
        if (options.length > 0) {
          askChoice = {
            options,
            multi: typeof p.multi === "boolean" ? p.multi : undefined,
          };
        }
      }
    }
  }

  // ASK_FORM (last one wins)
  {
    const { bodies, stripped } = collectBlock(working, "ASK_FORM");
    working = stripped;
    for (const b of bodies) {
      const parsed = safeJson(b);
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { fields?: unknown }).fields)
      ) {
        const p = parsed as { fields: unknown[]; submitLabel?: unknown };
        const fields: AskFormField[] = [];
        for (const raw of p.fields) {
          if (!raw || typeof raw !== "object") continue;
          const f = raw as Record<string, unknown>;
          const key = typeof f.key === "string" ? f.key : null;
          const label = typeof f.label === "string" ? f.label : null;
          const type = f.type;
          if (!key || !label) continue;
          if (type === "choice" && Array.isArray(f.options)) {
            const options = (f.options as unknown[]).filter(
              (o): o is string => typeof o === "string",
            );
            if (options.length > 0) {
              fields.push({
                key,
                type: "choice",
                label,
                options,
                required: typeof f.required === "boolean" ? f.required : undefined,
              });
            }
          } else if (type === "number") {
            fields.push({
              key,
              type: "number",
              label,
              min: typeof f.min === "number" ? f.min : undefined,
              max: typeof f.max === "number" ? f.max : undefined,
              step: typeof f.step === "number" ? f.step : undefined,
              required: typeof f.required === "boolean" ? f.required : undefined,
            });
          } else if (type === "text") {
            fields.push({
              key,
              type: "text",
              label,
              placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
              required: typeof f.required === "boolean" ? f.required : undefined,
            });
          } else if (type === "date") {
            fields.push({
              key,
              type: "date",
              label,
              required: typeof f.required === "boolean" ? f.required : undefined,
            });
          }
        }
        if (fields.length > 0) {
          askForm = {
            fields,
            submitLabel: typeof p.submitLabel === "string" ? p.submitLabel : undefined,
          };
        }
      }
    }
  }

  // ASK_FILE (last one wins) — body optional
  {
    // Handle both [ASK_FILE]{json}[/ASK_FILE] and bare [ASK_FILE][/ASK_FILE]
    const re = /\[ASK_FILE\]([\s\S]*?)\[\/ASK_FILE\]/g;
    working = working.replace(re, (_m, body: string) => {
      const trimmed = body.trim();
      if (trimmed.length === 0) {
        askFile = {};
      } else {
        const parsed = safeJson(trimmed);
        if (parsed && typeof parsed === "object") {
          const p = parsed as { accept?: unknown; label?: unknown; purpose?: unknown };
          askFile = {
            accept: typeof p.accept === "string" ? p.accept : undefined,
            label: typeof p.label === "string" ? p.label : undefined,
            purpose: typeof p.purpose === "string" ? p.purpose : undefined,
          };
        } else {
          askFile = {};
        }
      }
      return "";
    });
  }

  // Inline tags
  const hasPaywall = /\[PAYWALL\]/.test(working);
  const hasCalendly = /\[CALENDLY\]/.test(working);
  working = working.replace(/\[PAYWALL\]/g, "").replace(/\[CALENDLY\]/g, "");

  const cleanText = working.replace(/\n{3,}/g, "\n\n").trim();

  return {
    profileUpdates,
    pointsUpdate,
    matchUpdate,
    hasPaywall,
    hasCalendly,
    docUpdates,
    askChoice,
    askForm,
    askFile,
    cleanText,
  };
}
