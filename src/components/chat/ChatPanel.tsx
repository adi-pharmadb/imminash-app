"use client";

/**
 * ChatPanel (chat-first) — conversation-centric chat UI that POSTs to
 * /api/chat with {conversationId, message}, consumes the SSE stream,
 * strips markers from displayed assistant text, and replaces the local
 * ProjectedConversation whenever the server emits a {type:'state'} event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { MessageBubble } from "@/components/workspace/MessageBubble";
import { PaywallMessage } from "./PaywallMessage";
import { ChatForm } from "./ChatForm";
import { parseMarkers, type AskForm } from "@/lib/marker-parser";
import type { ProjectedConversation, ChatMessage } from "@/lib/conversation-state";

interface ChatPanelProps {
  projection: ProjectedConversation;
  onStateUpdate: (next: ProjectedConversation) => void;
}

interface AskChoiceState {
  options: string[];
  multi?: boolean;
}

export function ChatPanel({ projection, onStateUpdate }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [choice, setChoice] = useState<AskChoiceState | null>(null);
  const [form, setForm] = useState<AskForm | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: ChatMessage[] = projection.messages ?? [];
  const showPaywall = projection.phase === "awaiting_payment";

  const showIntro = messages.length === 0 && !isLoading && !streamingText;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, choice, form]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setChoice(null);
      setForm(null);
      setIsLoading(true);
      setStreamingText("");

      const optimistic: ProjectedConversation = {
        ...projection,
        messages: [
          ...messages,
          { role: "user", content: trimmed, createdAt: new Date().toISOString() },
        ],
      };
      onStateUpdate(optimistic);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: projection.id,
            message: trimmed,
          }),
        });
        if (!response.ok || !response.body) {
          throw new Error(`Chat API returned ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
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
                fullText += data.text;
                setStreamingText(parseMarkers(fullText).cleanText);
              } else if (data.type === "state") {
                onStateUpdate(data.state as ProjectedConversation);
              } else if (data.type === "choice") {
                setChoice(data.choice as AskChoiceState);
              } else if (data.type === "form") {
                setForm(data.form as AskForm);
              }
            } catch {
              // skip malformed events
            }
          }
        }
        setStreamingText("");
      } catch (err) {
        console.error("chat send error:", err);
        setStreamingText("");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, projection, onStateUpdate],
  );

  const handleSend = useCallback(async () => {
    const value = input;
    setInput("");
    await sendMessage(value);
  }, [input, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background" data-testid="chat-panel">
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-1">
          {showIntro && (
            <div className="py-8 text-center">
              <p className="font-display text-2xl text-foreground">
                Welcome to Imminash.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Tell me a bit about yourself and I&apos;ll start mapping your pathway.
                You can say something like <em>&quot;I&apos;m 29, on a 485 visa, software engineer&quot;</em>.
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role !== "user" && msg.role !== "assistant") return null;
            return (
              <MessageBubble
                key={i}
                role={msg.role}
                content={parseMarkers(String(msg.content ?? "")).cleanText}
              />
            );
          })}

          {showPaywall && <PaywallMessage conversationId={projection.id} />}

          {isLoading && streamingText && (
            <MessageBubble role="assistant" content={streamingText} />
          )}

          {isLoading && !streamingText && (
            <div className="mb-3 flex justify-start" data-testid="loading-indicator">
              <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {choice && !isLoading && !showPaywall && (
            <div className="mb-3 mt-2 flex flex-wrap gap-2" data-testid="choice-pills">
              {choice.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => sendMessage(opt)}
                  className="rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {form && !isLoading && !showPaywall && (
            <ChatForm
              form={form}
              onSubmit={(serialised) => sendMessage(serialised)}
              onCancel={() => setForm(null)}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/30 p-4 md:p-5">
        <div className="glass-card mx-auto flex max-w-2xl items-end gap-3 rounded-xl p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={showPaywall ? "Complete payment to continue…" : "Type your message..."}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            disabled={isLoading || showPaywall}
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || showPaywall}
            className="glow-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
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
