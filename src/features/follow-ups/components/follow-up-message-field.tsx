"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";

import type { MessageTemplateApiRecord, TemplatesListResponse } from "@/types/templates-api";
import { TEMPLATE_TYPE_OPTIONS } from "@/features/templates/config/template-type-definitions";
import { apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TYPE_LABEL = new Map<string, string>(TEMPLATE_TYPE_OPTIONS.map((t) => [t.id, t.label]));

/** Plain-text templates are copied into the box (editable); others are sent as saved. */
export function isTextTemplate(t: Pick<MessageTemplateApiRecord, "typeId">): boolean {
  return t.typeId === "text_message";
}

let cache: Promise<MessageTemplateApiRecord[]> | null = null;

/** Active templates, loaded once per page visit and shared by every follow-up card. */
export function useActiveTemplates(): MessageTemplateApiRecord[] | null {
  const [list, setList] = React.useState<MessageTemplateApiRecord[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    if (!cache) {
      cache = apiJson<TemplatesListResponse>("/v1/templates")
        .then((r) => r.templates.filter((t) => t.active !== false))
        .catch(() => {
          cache = null;
          return [];
        });
    }
    void cache.then((l) => {
      if (!cancelled) setList(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

const selectClass =
  "h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function FollowUpMessageField({
  id,
  message,
  onMessageChange,
  templateId,
  onTemplateChange,
  rows = 3,
}: {
  id?: string;
  message: string;
  onMessageChange: (v: string) => void;
  templateId: string | null;
  onTemplateChange: (id: string | null) => void;
  rows?: number;
}) {
  const templates = useActiveTemplates();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const attached = templateId ? templates?.find((t) => t.id === templateId) : null;

  function pick(idValue: string) {
    const t = templates?.find((x) => x.id === idValue);
    if (!t) return;
    if (isTextTemplate(t)) {
      onTemplateChange(null);
      onMessageChange(t.body ?? "");
    } else {
      onTemplateChange(t.id);
      onMessageChange(t.body ?? "");
    }
  }

  function insertName() {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? message.length;
    const end = el?.selectionEnd ?? message.length;
    const next = `${message.slice(0, start)}{name}${message.slice(end)}`;
    onMessageChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 6, start + 6);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        {templates === null ? (
          <span className="text-xs text-muted-foreground">Loading templates…</span>
        ) : templates.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No templates yet.{" "}
            <Link href="/templates" className="underline underline-offset-2">
              Create one
            </Link>{" "}
            to reuse messages.
          </span>
        ) : (
          <select
            aria-label="Use a template"
            className={selectClass}
            value=""
            onChange={(e) => pick(e.target.value)}
          >
            <option value="">Use a saved template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {isTextTemplate(t) ? "" : ` · ${TYPE_LABEL.get(t.typeId) ?? t.typeId}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {templateId ? (
        <div className="space-y-2 rounded-lg border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">
                {attached?.name ?? "Saved template"}
              </span>
              {attached ? (
                <Badge variant="secondary">{TYPE_LABEL.get(attached.typeId) ?? attached.typeId}</Badge>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onTemplateChange(null)}
            >
              <X className="size-4" />
              Use plain text
            </Button>
          </div>
          {message ? (
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{message}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Sent exactly as saved in Templates, with its media and buttons.
            {templates !== null && !attached
              ? " This template is no longer active: pick another or use plain text."
              : ""}
          </p>
        </div>
      ) : (
        <>
          <Textarea
            id={id}
            ref={textareaRef}
            rows={rows}
            maxLength={1500}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Message to send on that day"
            className="text-sm"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={insertName}>
              + {"{name}"}
            </Button>
            <span>is replaced with the customer&apos;s name.</span>
          </div>
        </>
      )}
    </div>
  );
}
