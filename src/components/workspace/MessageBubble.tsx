"use client";

/**
 * Message — flowing prose layout (inspired by Fred's clean chat pattern).
 *
 * - Assistant messages render as pure markdown prose with no bubble/box.
 *   Attribution is inferred from position and a tiny "imminash" label.
 * - User messages are a subtle bordered card with muted bg.
 *
 * This is the opposite of the bubble pattern. The goal is for responses
 * to feel like documents, not chat-app messages. Tables, headings, lists,
 * and code render naturally inside the flow.
 */

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div
        className="mb-5 w-full rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground"
        data-testid="message-user"
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    );
  }

  return (
    <div
      className="group mb-6 px-1"
      data-testid="message-assistant"
    >
      <MarkdownRenderer content={content} />
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse bg-primary" />
      )}
    </div>
  );
}
