"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AiAction = "write" | "shorter" | "polite" | "grammar" | "version";

const AI_ACTIONS: { id: Exclude<AiAction, "write">; label: string }[] = [
  { id: "shorter", label: "Shorter" },
  { id: "polite", label: "More polite" },
  { id: "grammar", label: "Fix grammar" },
  { id: "version", label: "Make another version" },
];

const MAX_LEN = 4096;

/**
 * Message text with versions, WhatsApp formatting, variable buttons and AI helpers.
 * Version 1 is the main text; up to 5 versions, one picked at random per send.
 */
export function TemplateTextEditor({
  versionCount,
  activeVersion,
  onSelectVersion,
  onAddVersion,
  onRemoveVersion,
  allVersions,
  text,
  onTextChange,
  variableKeys,
}: {
  versionCount: number;
  activeVersion: number;
  onSelectVersion: (i: number) => void;
  onAddVersion: (text?: string) => void;
  onRemoveVersion: (i: number) => void;
  allVersions: string[];
  text: string;
  onTextChange: (v: string) => void;
  variableKeys: string[];
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = React.useState<AiAction | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [promptOpen, setPromptOpen] = React.useState(false);

  function insertAtCursor(before: string, after = "") {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const selected = text.slice(start, end);
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    onTextChange(next.slice(0, MAX_LEN));
    requestAnimationFrame(() => {
      el?.focus();
      const caret = start + before.length + selected.length + (selected ? after.length : 0);
      el?.setSelectionRange(selected ? caret : start + before.length, selected ? caret : start + before.length);
    });
  }

  async function runAi(action: AiAction) {
    setBusy(action);
    try {
      const res = await apiJson<{ text: string }>("/v1/templates/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text,
          prompt: action === "write" ? aiPrompt : undefined,
          avoid: action === "version" ? allVersions.filter((v) => v.trim()) : undefined,
        }),
      });
      if (action === "version") {
        if (versionCount >= 5) {
          toast.error("Up to 5 versions per template");
        } else {
          onAddVersion(res.text);
          toast.success("New version added");
        }
      } else {
        onTextChange(res.text);
        if (action === "write") {
          setPromptOpen(false);
          setAiPrompt("");
        }
      }
    } catch (err) {
      toast.error("AI could not help", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  const toolBtn =
    "inline-flex size-9 items-center justify-center rounded-md border bg-background text-sm hover:bg-muted";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="tpl-body" className="text-sm font-semibold">
          Message
        </Label>
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Message versions">
          {Array.from({ length: versionCount }, (_, i) => {
            const on = i === activeVersion;
            return (
              <span
                key={i}
                className={
                  "inline-flex h-8 items-center rounded-md border text-xs " +
                  (on ? "border-primary bg-primary/10 font-semibold" : "bg-background text-muted-foreground")
                }
              >
                <button type="button" role="tab" aria-selected={on} className="h-full px-2.5" onClick={() => onSelectVersion(i)}>
                  Version {i + 1}
                </button>
                {i > 0 && on ? (
                  <button
                    type="button"
                    aria-label={`Delete version ${i + 1}`}
                    className="mr-1 rounded p-0.5 hover:bg-muted"
                    onClick={() => onRemoveVersion(i)}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
          {versionCount < 5 ? (
            <button
              type="button"
              className="h-8 rounded-md border border-dashed px-2.5 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => onAddVersion("")}
            >
              + Version
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Formatting and variables">
        <button type="button" aria-label="Bold" className={toolBtn + " font-bold"} onClick={() => insertAtCursor("*", "*")}>
          B
        </button>
        <button type="button" aria-label="Italic" className={toolBtn + " italic"} onClick={() => insertAtCursor("_", "_")}>
          I
        </button>
        <button type="button" aria-label="Strikethrough" className={toolBtn + " line-through"} onClick={() => insertAtCursor("~", "~")}>
          S
        </button>
        <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        {variableKeys
          .filter((k) => k)
          .map((k) => (
            <button
              key={k}
              type="button"
              className="h-9 rounded-md border border-primary/30 bg-primary/5 px-2.5 font-mono text-xs text-primary hover:bg-primary/10"
              onClick={() => insertAtCursor(`{${k}}`)}
            >
              + {`{${k}}`}
            </button>
          ))}
      </div>

      <Textarea
        id="tpl-body"
        ref={ref}
        value={text}
        maxLength={MAX_LEN}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={activeVersion === 0 ? "Hi {name}, …" : "Same message, different words"}
        className="min-h-36 text-[15px] leading-relaxed"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">AI:</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy !== null}
          onClick={() => setPromptOpen((o) => !o)}
          aria-expanded={promptOpen}
        >
          <Sparkles className="size-3.5" />
          Write with AI
        </Button>
        {AI_ACTIONS.map((a) => (
          <Button
            key={a.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null || !text.trim() || (a.id === "version" && versionCount >= 5)}
            onClick={() => void runAi(a.id)}
          >
            {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {a.label}
          </Button>
        ))}
      </div>
      {promptOpen ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (aiPrompt.trim()) void runAi("write");
              }
            }}
            placeholder="What should it say? e.g. remind about the hosting offer, ask if they need help"
            aria-label="Describe the message for the AI"
            className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button type="button" size="sm" className="h-10" disabled={busy !== null || !aiPrompt.trim()} onClick={() => void runAi("write")}>
            {busy === "write" ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Write
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {versionCount > 1
            ? `One of the ${versionCount} versions is picked at random each time, so messages never look identical.`
            : "Add a second version so repeated messages don’t look identical."}
        </span>
        <span>
          {text.length} / {MAX_LEN}
        </span>
      </div>
    </div>
  );
}
