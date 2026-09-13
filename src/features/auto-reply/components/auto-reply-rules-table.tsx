"use client";

import { Pencil, Sparkles, Trash2 } from "lucide-react";

import type { AutoReplyRule } from "@/types/auto-reply";

function triggerLabel(t: AutoReplyRule["triggerType"]): string {
  switch (t) {
    case "keyword":
      return "Keyword";
    case "exact":
      return "Exact";
    case "contains":
      return "Contains";
    case "starts_with":
      return "Starts";
    case "ends_with":
      return "Ends";
    case "regex":
      return "Regex";
    default:
      return t;
  }
}

function modeLabel(m: AutoReplyRule["messageMode"]): string {
  switch (m) {
    case "text":
      return "Text";
    case "template":
      return "Template";
    case "media":
      return "Media";
    default:
      return m;
  }
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AutoReplyRulesTableProps = {
  rules: AutoReplyRule[];
  togglingId: string | null;
  onToggleActive: (rule: AutoReplyRule, active: boolean) => void;
  onEdit: (rule: AutoReplyRule) => void;
  onDelete: (rule: AutoReplyRule) => void;
};

export function AutoReplyRulesTable({
  rules,
  togglingId,
  onToggleActive,
  onEdit,
  onDelete,
}: AutoReplyRulesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule</TableHead>
          <TableHead>Triggers</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Session</TableHead>
          <TableHead className="tabular-nums">Priority</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="tabular-nums">Responses</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-medium text-foreground">{r.name}</p>
                  {r.aiSkillName ? (
                    <Badge
                      variant="secondary"
                      className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <Sparkles className="mr-1 size-2.5" />
                      Skill: {r.aiSkillName}
                    </Badge>
                  ) : null}
                </div>
                {r.openAiEnabled && !r.aiSkillName ? (
                  <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-300">
                    OpenAI on · fallback below
                  </p>
                ) : null}
                {r.templateName ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Template: {r.templateName}
                  </p>
                ) : null}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.response}
                </p>
              </div>
            </TableCell>
            <TableCell className="max-w-[min(100vw,280px)] align-top">
              <Badge
                variant="secondary"
                className="inline-flex max-w-full rounded-md whitespace-normal text-left font-medium leading-snug"
              >
                {r.keyword}
              </Badge>
              {r.caseSensitive ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Case-sensitive
                </p>
              ) : null}
            </TableCell>
            <TableCell className="align-top text-muted-foreground">
              <div className="flex flex-col gap-1 text-xs">
                <span>{triggerLabel(r.triggerType)}</span>
                <Badge variant="outline" className="w-fit rounded-md font-medium">
                  {modeLabel(r.messageMode)}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground">
              {r.deviceLabel}
            </TableCell>
            <TableCell className="tabular-nums">{r.priority}</TableCell>
            <TableCell>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.active}
                  disabled={togglingId === r.id}
                  onChange={(e) => onToggleActive(r, e.target.checked)}
                  aria-label={
                    r.active ? `Deactivate ${r.name}` : `Activate ${r.name}`
                  }
                  className="size-4 rounded border-input accent-primary focus:ring-ring/20 disabled:opacity-50"
                />
              </label>
            </TableCell>
            <TableCell className="tabular-nums">{r.responseCount}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
                  onClick={() => onEdit(r)}
                  aria-label={`Edit ${r.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md text-destructive hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/30"
                  onClick={() => onDelete(r)}
                  aria-label={`Delete ${r.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
