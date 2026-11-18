"use client";

import * as React from "react";

import type { MessageTemplateApiRecord, TemplatesListResponse } from "@/types/templates-api";
import { TEMPLATE_TYPE_OPTIONS } from "@/features/templates/config/template-type-definitions";
import { folderLabel, isOfferedIn, renderTemplateText } from "@/features/templates/lib/render-template-text";
import { apiJson } from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_LABEL = new Map<string, string>(TEMPLATE_TYPE_OPTIONS.map((t) => [t.id, t.label]));

/**
 * "/" quick replies for the live chat box: typing "/" (optionally followed by a search word)
 * opens a list of templates switched on for live chat; picking one fills the box with the
 * text, {name} already filled, ready to edit.
 */
export function useQuickReplies(opts: {
  draft: string;
  setDraft: (v: string) => void;
  contact: { name?: string | null; phone?: string | null };
}) {
  const { draft, setDraft, contact } = opts;
  const [templates, setTemplates] = React.useState<MessageTemplateApiRecord[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [dismissed, setDismissed] = React.useState<string | null>(null);

  const query = /^\/[^\s/]*$/.test(draft) ? draft.slice(1).toLowerCase() : null;
  const open = query !== null && dismissed !== draft;

  React.useEffect(() => {
    if (!open || templates) return;
    let cancelled = false;
    apiJson<TemplatesListResponse>("/v1/templates")
      .then((r) => {
        if (!cancelled) setTemplates(r.templates.filter((t) => isOfferedIn(t, "live_chat")));
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, templates]);

  const items = React.useMemo(() => {
    if (!open || !templates) return [];
    const q = query ?? "";
    return templates
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          (t.body ?? "").toLowerCase().includes(q) ||
          (t.tags ?? []).some((g) => g.includes(q)) ||
          t.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [open, templates, query]);

  const safeIndex = Math.min(index, Math.max(0, items.length - 1));

  function pick(i: number) {
    const t = items[i];
    if (!t) return;
    setDraft(renderTemplateText(t.body ?? "", t.variables ?? [], contact));
    setIndex(0);
  }

  /** Returns true when the key was used by the menu. */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open || items.length === 0) {
      if (open && e.key === "Escape") {
        setDismissed(draft);
        return true;
      }
      return false;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((safeIndex + 1) % items.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((safeIndex - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(safeIndex);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(draft);
      return true;
    }
    return false;
  }

  const menu = open ? (
    <div className="overflow-hidden rounded-lg border bg-popover text-sm shadow-lg" role="listbox" aria-label="Templates">
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        {templates === null
          ? "Loading templates…"
          : items.length === 0
            ? "No template matches. Turn on “Live chat quick replies” in a template to list it here."
            : "Templates · ↑↓ to move, Enter to insert, Esc to close"}
      </p>
      {items.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="option"
          aria-selected={i === safeIndex}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(i)}
          className={cn(
            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left",
            i === safeIndex ? "bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-muted"
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{t.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {renderTemplateText(t.body ?? "", t.variables ?? [], contact) || "—"}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t.typeId === "text_message" ? folderLabel(t.category) : `${TYPE_LABEL.get(t.typeId) ?? t.typeId} · text only`}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return { open, onKeyDown, menu };
}
