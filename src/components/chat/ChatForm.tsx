"use client";

/**
 * ChatForm — renders a compact multi-field form from an ASK_FORM marker.
 * On submit, serialises answers as "Label: value, Label: value, ..." and
 * calls onSubmit with that string; the parent dispatches it as the user's
 * next chat message.
 */

import { useState } from "react";
import { X } from "lucide-react";
import type { AskForm } from "@/lib/marker-parser";

interface ChatFormProps {
  form: AskForm;
  onSubmit: (serialised: string) => void;
  onCancel: () => void;
}

export function ChatForm({ form, onSubmit, onCancel }: ChatFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const setField = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify required fields
    for (const f of form.fields) {
      if (f.required !== false) {
        const v = values[f.key];
        if (v === undefined || v === "") return;
      }
    }
    // Serialise as "Label: value, Label: value, ..."
    const parts: string[] = [];
    for (const f of form.fields) {
      const v = values[f.key];
      if (v === undefined || v === "") continue;
      parts.push(`${f.label}: ${v}`);
    }
    const message = parts.join(", ");
    onSubmit(message);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-3 mt-2 rounded-xl border border-border bg-card p-4"
      data-testid="chat-form"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Your answer
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss form"
          title="Use text input instead"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {form.fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`form-${f.key}`}
              className="text-xs font-medium text-foreground/80"
            >
              {f.label}
            </label>
            {f.type === "choice" ? (
              <select
                id={`form-${f.key}`}
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                required={f.required !== false}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>
                  Select…
                </option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : f.type === "number" ? (
              <input
                id={`form-${f.key}`}
                type="number"
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                min={f.min}
                max={f.max}
                step={f.step}
                required={f.required !== false}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            ) : f.type === "date" ? (
              <input
                id={`form-${f.key}`}
                type="date"
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                required={f.required !== false}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <input
                id={`form-${f.key}`}
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                required={f.required !== false}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110"
        >
          {form.submitLabel ?? "Submit"}
        </button>
      </div>
    </form>
  );
}
