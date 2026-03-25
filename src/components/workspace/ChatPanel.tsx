"use client";

/**
 * Left panel: chat message interface.
 * Handles user input, sends messages to /api/chat, parses SSE stream,
 * and extracts document updates from AI responses.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { MessageBubble } from "@/components/workspace/MessageBubble";
import { parseDocumentUpdates, parseACSFormUpdates, stripDocumentMarkers } from "@/lib/duty-alignment";
import type { ChatMessage } from "@/lib/workspace-helpers";
import type { DocumentUpdate, ACSFormUpdate } from "@/lib/duty-alignment";

interface ChatPanelProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  assessmentId: string;
  onDocumentUpdates: (updates: DocumentUpdate[]) => void;
  onACSFormUpdates?: (updates: ACSFormUpdate[]) => void;
}

export function ChatPanel({
  messages,
  onMessagesChange,
  assessmentId,
  onDocumentUpdates,
  onACSFormUpdates,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          assessmentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.type === "text") {
              fullResponse += data.text;
              setStreamingText(stripDocumentMarkers(fullResponse));
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

      // Finalize: add assistant message, extract document updates
      const cleanText = stripDocumentMarkers(fullResponse);
      const docUpdates = parseDocumentUpdates(fullResponse);

      const finalMessages: ChatMessage[] = [
        ...updatedMessages,
        { role: "assistant", content: cleanText },
      ];
      onMessagesChange(finalMessages);
      setStreamingText("");

      if (docUpdates.length > 0) {
        onDocumentUpdates(docUpdates);
      }

      // Extract ACS form updates
      if (onACSFormUpdates) {
        const acsUpdates = parseACSFormUpdates(fullResponse);
        if (acsUpdates.length > 0) {
          onACSFormUpdates(acsUpdates);
        }
      }
    } catch (error) {
      console.error("Chat send error:", error);
      const errorMessages: ChatMessage[] = [
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ];
      onMessagesChange(errorMessages);
      setStreamingText("");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, assessmentId, onMessagesChange, onDocumentUpdates, onACSFormUpdates]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background" data-testid="chat-panel">
      {/* Messages area - spacious premium feel */}
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-6 lg:px-8">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display text-xl italic text-muted-foreground/60">
              Start a conversation
            </p>
            <p className="mt-2 text-sm text-muted-foreground/40">
              Ask about your migration documents
            </p>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-1">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {/* Streaming text display */}
          {isLoading && streamingText && (
            <MessageBubble role="assistant" content={streamingText} />
          )}

          {/* Loading indicator */}
          {isLoading && !streamingText && (
            <div className="flex justify-start mb-3" data-testid="loading-indicator">
              <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - glass-card styled */}
      <div className="border-t border-border/30 p-4 md:p-5">
        <div className="glass-card mx-auto flex max-w-2xl items-end gap-3 rounded-xl p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            disabled={isLoading}
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="glow-amber flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
            aria-label="Send message"
            data-testid="send-button"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
