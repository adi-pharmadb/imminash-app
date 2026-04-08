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

export interface ParsedMarkers {
  profileUpdates: Record<string, unknown>[];
  pointsUpdate: Record<string, unknown> | null;
  matchUpdate: Record<string, unknown> | null;
  hasPaywall: boolean;
  hasCalendly: boolean;
  docUpdates: DocUpdate[];
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

export function parseMarkers(text: string): ParsedMarkers {
  let working = text;

  const profileUpdates: Record<string, unknown>[] = [];
  const docUpdates: DocUpdate[] = [];
  let pointsUpdate: Record<string, unknown> | null = null;
  let matchUpdate: Record<string, unknown> | null = null;

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
    cleanText,
  };
}
