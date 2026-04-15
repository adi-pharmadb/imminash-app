"use client";

/**
 * ChatFileDrop — drag-and-drop upload tile rendered inline in the chat
 * when the assistant emits an ASK_FILE marker. Falls back to a click-to-
 * browse button. Calls onFile with the selected/dropped file.
 */

import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import type { AskFile } from "@/lib/marker-parser";

interface ChatFileDropProps {
  ask: AskFile;
  onFile: (file: File) => void;
  onCancel: () => void;
}

function acceptAttribute(accept?: string): string {
  // Default to PDF + DOCX unless explicitly narrowed
  if (!accept || accept.trim() === "") return ".pdf,.docx";
  const parts = accept.toLowerCase().split(",").map((p) => p.trim());
  const out: string[] = [];
  if (parts.includes("pdf")) out.push(".pdf", "application/pdf");
  if (parts.includes("docx")) {
    out.push(
      ".docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  }
  return out.length > 0 ? out.join(",") : ".pdf,.docx";
}

export function ChatFileDrop({ ask, onFile, onCancel }: ChatFileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const label = ask.label ?? "Upload your CV";

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="mb-3 mt-2" data-testid="chat-file-drop">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss upload"
          title="Use text input instead"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-2 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Drop PDF or DOCX here, or click to browse
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttribute(ask.accept)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}
