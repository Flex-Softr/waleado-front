"use client";

import { Edit3, Trash2 } from "lucide-react";

import type {
  CallResponderCallType,
  CallResponderRule,
} from "@/types/call-responder";
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
import { cn } from "@/lib/utils";

function callTypeBadge(t: CallResponderCallType) {
  switch (t) {
    case "missed":
      return (
        <Badge
          key={t}
          variant="outline"
          className="border-amber-300 bg-amber-50 text-[11px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          Missed
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          key={t}
          variant="outline"
          className="border-red-300 bg-red-50 text-[11px] font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          Rejected
        </Badge>
      );
    case "received":
      return (
        <Badge
          key={t}
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Received
        </Badge>
      );
    case "outgoing":
      return (
        <Badge
          key={t}
          variant="outline"
          className="border-sky-300 bg-sky-50 text-[11px] font-bold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
        >
          Outgoing
        </Badge>
      );
    default:
      return (
        <Badge key={t} variant="secondary" className="text-[11px] font-medium">
          {t}
        </Badge>
      );
  }
}

type CallResponderRulesTableProps = {
  rules: CallResponderRule[];
  onEdit?: (rule: CallResponderRule) => void;
  onToggleActive?: (rule: CallResponderRule, nextActive: boolean) => void;
  onDelete: (rule: CallResponderRule) => void;
};

export function CallResponderRulesTable({
  rules,
  onEdit,
  onToggleActive,
  onDelete,
}: CallResponderRulesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold">Rule & Custom Text</TableHead>
          <TableHead className="font-bold">WhatsApp Session</TableHead>
          <TableHead className="font-bold">Call Triggers</TableHead>
          <TableHead className="tabular-nums font-bold">Delay</TableHead>
          <TableHead className="tabular-nums font-bold">Responses Sent</TableHead>
          <TableHead className="tabular-nums font-bold">Status</TableHead>
          <TableHead className="w-[100px] text-right font-bold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r) => (
          <TableRow key={r.id} className="group hover:bg-muted/40 transition-colors">
            <TableCell>
              <div className="min-w-0 max-w-xs sm:max-w-sm">
                <p className="font-bold text-foreground truncate">{r.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {r.messageFormType === "text"
                    ? r.messageBody || "(No message body set)"
                    : r.templateName
                    ? `Template: ${r.templateName}`
                    : "Template message"}
                </p>
              </div>
            </TableCell>
            <TableCell className="max-w-[160px] truncate text-xs font-semibold text-muted-foreground">
              {r.deviceLabel}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {r.callTypes.map(callTypeBadge)}
              </div>
            </TableCell>
            <TableCell className="tabular-nums text-xs font-semibold text-muted-foreground">
              {r.responseDelayMinutes === 0
                ? "Instant"
                : `${r.responseDelayMinutes} min`}
            </TableCell>
            <TableCell className="tabular-nums text-xs font-bold text-foreground">
              {r.responsesSent}
            </TableCell>
            <TableCell>
              {onToggleActive ? (
                <button
                  type="button"
                  onClick={() => onToggleActive(r, !r.active)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors",
                    r.active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  )}
                  title={r.active ? "Click to disable" : "Click to enable"}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      r.active ? "bg-emerald-500" : "bg-slate-400"
                    )}
                  />
                  {r.active ? "Active" : "Paused"}
                </button>
              ) : (
                <Badge
                  variant={r.active ? "default" : "secondary"}
                  className="text-xs font-bold"
                >
                  {r.active ? "Active" : "Paused"}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {onEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => onEdit(r)}
                    title={`Edit ${r.name}`}
                  >
                    <Edit3 className="size-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(r)}
                  title={`Delete ${r.name}`}
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
