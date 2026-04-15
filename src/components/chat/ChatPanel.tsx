"use client";

/**
 * ChatPanel (chat-first) — conversation-centric chat UI that POSTs to
 * /api/chat with {conversationId, message}, consumes the SSE stream,
 * strips markers from displayed assistant text, and replaces the local
 * ProjectedConversation whenever the server emits a {type:'state'} event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { MessageBubble } from "@/components/workspace/MessageBubble";
import { PaywallMessage } from "./PaywallMessage";
import { ChatForm } from "./ChatForm";
import { ChatFileDrop } from "./ChatFileDrop";
import {
  parseMarkers,
  stripInFlightMarkers,
  type AskFile,
  type AskForm,
} from "@/lib/marker-parser";
import type { ProjectedConversation, ChatMessage } from "@/lib/conversation-state";

interface ChatPanelProps {
  projection: ProjectedConversation;
  onStateUpdate: (next: ProjectedConversation) => void;
  /**
   * When true, ChatPanel fires a hidden "__continue__" to /api/chat on mount
   * to resume Phase 2 after payment. Shows the normal streaming UI.
   */
  kickoffContinue?: boolean;
  onKickoffDone?: () => void;
}

interface AskChoiceState {
  options: string[];
  multi?: boolean;
}

export function ChatPanel({
  projection,
  onStateUpdate,
  kickoffContinue,
  onKickoffDone,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [choice, setChoice] = useState<AskChoiceState | null>(null);
  const [form, setForm] = useState<AskForm | null>(null);
  const [fileAsk, setFileAsk] = useState<AskFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages: ChatMessage[] = projection.messages ?? [];
  const showPaywall = projection.phase === "awaiting_payment";

  const showIntro = messages.length === 0 && !isLoading && !streamingText;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, choice, form]);

  const sendMessage = useCallback(
    async (text: string, opts: { hidden?: boolean } = {}) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setChoice(null);
      setForm(null);
      setFileAsk(null);
      setIsLoading(true);
      setStreamingText("");

      if (!opts.hidden) {
        const optimistic: ProjectedConversation = {
          ...projection,
          messages: [
            ...messages,
            { role: "user", content: trimmed, createdAt: new Date().toISOString() },
          ],
        };
        onStateUpdate(optimistic);
      }

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
                setStreamingText(stripInFlightMarkers(fullText));
              } else if (data.type === "state") {
                onStateUpdate(data.state as ProjectedConversation);
              } else if (data.type === "choice") {
                setChoice(data.choice as AskChoiceState);
              } else if (data.type === "form") {
                setForm(data.form as AskForm);
              } else if (data.type === "file") {
                setFileAsk(data.file as AskFile);
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

  const handleCVUpload = useCallback(
    async (file: File) => {
      if (isLoading || isUploading) return;

      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        await sendMessage(`I tried to upload "${file.name}" but only PDF or DOCX is supported.`);
        return;
      }

      setFileAsk(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-cv", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`parse-cv ${res.status}`);
        const result = await res.json();

        // Persist CV data to the conversation row.
        await fetch(`/api/conversations/${projection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv_data: {
              filename: result.filename,
              extractedText: result.extractedText,
              employers: result.employers,
              qualifications: result.qualifications,
            },
          }),
        });

        const summaryLine = result.summary ?? "I've received your CV.";
        const userMsg = `[Uploaded CV: ${result.filename}]\n\n${summaryLine}`;
        await sendMessage(userMsg);
      } catch (err) {
        console.error("cv upload failed:", err);
        await sendMessage(`I tried to upload ${file.name} but the parse failed. Want me to ask for your employment history directly?`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [isLoading, isUploading, projection.id, sendMessage],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCVUpload(file);
  };

  // Fire a hidden __continue__ exactly once when the parent signals a paid
  // kickoff. Uses the normal streaming UI so the user sees a loading bubble
  // and the Phase 2 greeting as it arrives.
  const kickoffFiredRef = useRef(false);
  useEffect(() => {
    if (!kickoffContinue) return;
    if (kickoffFiredRef.current) return;
    if (isLoading) return;
    kickoffFiredRef.current = true;
    (async () => {
      await sendMessage("__continue__", { hidden: true });
      onKickoffDone?.();
    })();
  }, [kickoffContinue, isLoading, sendMessage, onKickoffDone]);

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

          {fileAsk && !isLoading && !isUploading && !showPaywall && (
            <ChatFileDrop
              ask={fileAsk}
              onFile={handleCVUpload}
              onCancel={() => setFileAsk(null)}
            />
          )}

          {isUploading && (
            <div className="mb-3 mt-2 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Parsing your CV…
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/30 p-4 md:p-5">
        <div className="glass-card mx-auto flex max-w-2xl items-end gap-2 rounded-xl p-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileInputChange}
            className="hidden"
            data-testid="cv-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading || showPaywall}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label="Upload CV"
            title="Upload CV (PDF or DOCX)"
            data-testid="cv-upload-button"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={showPaywall ? "Complete payment to continue…" : "Type your message..."}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            disabled={isLoading || isUploading || showPaywall}
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isUploading || showPaywall}
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
