"use client";

/**
 * Chat message bubble component.
 * User messages are right-aligned with primary blue.
 * AI messages are left-aligned with glass-card style and markdown rendering.
 */

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

/**
 * Minimal markdown rendering: bold, italic, line breaks, and lists.
 * Avoids adding a heavy dependency for simple formatting.
 */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br />");
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      data-testid={`message-${role}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground shadow-lg shadow-primary/10"
            : "glass-card rounded-bl-md text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 [&_li]:ml-4 [&_li]:list-disc [&_li]:text-foreground/90"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}
