"use client";

import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type {
  FollowUpApi,
  FollowUpMutationResponse,
  FollowUpPatch,
  FollowUpsListResponse,
  FollowUpView,
  LeadStage,
} from "@/types/follow-ups-api";
import { FollowUpSettingsCard } from "@/features/follow-ups/components/follow-up-settings-card";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { AddFollowUpDialog } from "@/features/follow-ups/components/add-follow-up-dialog";
import { FollowUpMessageField } from "@/features/follow-ups/components/follow-up-message-field";
import { ApiError, apiFetch, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const VIEWS: { id: FollowUpView; label: string; hint: string }[] = [
  { id: "today", label: "Today", hint: "Conversations from today" },
  { id: "suggested", label: "To approve", hint: "AI suggestions waiting for your approval" },
  { id: "scheduled", label: "Scheduled", hint: "Follow-ups waiting to go out" },
  { id: "converted", label: "Converted", hint: "Customers who bought" },
  { id: "all", label: "All", hint: "Everyone in your follow-up list" },
];

const STAGE_LABEL: Record<LeadStage, string> = {
  NEW: "New",
  INTERESTED: "Interested",
  READY_TO_BUY: "Ready to buy",
  OBJECTION: "Hesitating",
  CONVERTED: "Converted",
  LOST: "Not interested",
};

const STAGE_STYLE: Record<LeadStage, string> = {
  NEW: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  INTERESTED: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  READY_TO_BUY: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  OBJECTION: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  CONVERTED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  LOST: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
};

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** ISO → value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function FollowUpCard({
  item,
  onChange,
  onRemove,
}: {
  item: FollowUpApi;
  onChange: (next: FollowUpApi) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = React.useState(toLocalInput(item.followUpAt));
  const [message, setMessage] = React.useState(item.followUpMessage ?? "");
  const [templateId, setTemplateId] = React.useState<string | null>(item.followUpTemplateId);
  const [busy, setBusy] = React.useState<string | null>(null);

  const closed = item.stage === "CONVERTED" || item.stage === "LOST";
  const scheduled = item.followUpStatus === "SCHEDULED";
  const suggested = item.followUpStatus === "SUGGESTED";
  const dirty =
    date !== toLocalInput(item.followUpAt) ||
    message.trim() !== (item.followUpMessage ?? "").trim() ||
    templateId !== item.followUpTemplateId;
  const hasContent = Boolean(message.trim()) || Boolean(templateId);

  async function patch(label: string, body: FollowUpPatch, success: string) {
    setBusy(label);
    try {
      const res = await apiJson<FollowUpMutationResponse>(`/v1/follow-ups/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onChange(res.item);
      toast.success(success);
    } catch (err) {
      toast.error("Could not update", { description: errMessage(err, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${item.displayTitle} from your follow-up list?`)) return;
    setBusy("remove");
    try {
      const res = await apiFetch(`/v1/follow-ups/${item.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new ApiError(res.status, res.statusText);
      onRemove(item.id);
      toast.success("Removed from follow-ups");
    } catch (err) {
      toast.error("Could not remove", { description: errMessage(err, "Please try again.") });
      setBusy(null);
    }
  }

  async function sendNow() {
    if (!window.confirm(`Send this follow-up to ${item.displayTitle} now?`)) return;
    setBusy("send");
    try {
      // Save any edits first so the saved text is exactly what gets sent.
      if (dirty) {
        const saved = await apiJson<FollowUpMutationResponse>(`/v1/follow-ups/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followUpMessage: message,
            followUpTemplateId: templateId,
            followUpAt: fromLocalInput(date),
          }),
        });
        onChange(saved.item);
      }
      const res = await apiJson<FollowUpMutationResponse>(`/v1/follow-ups/${item.id}/send-now`, {
        method: "POST",
      });
      onChange(res.item);
      toast.success("Follow-up sent");
    } catch (err) {
      toast.error("Could not send", { description: errMessage(err, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {item.displayTitle}
              </span>
            </div>
            {item.peerPhone && item.displayTitle !== item.peerPhone ? (
              <p className="ml-6 text-xs text-muted-foreground">{item.peerPhone}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {item.needsHuman ? (
              <Badge variant="secondary" className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                Needs you
              </Badge>
            ) : null}
            {item.source === "MANUAL" ? (
              <Badge variant="secondary">Added by you</Badge>
            ) : null}
            <Badge variant="secondary" className={STAGE_STYLE[item.stage]}>
              {STAGE_LABEL[item.stage]}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">
          {item.summary || (item.source === "MANUAL" ? "" : "No summary yet.")}
        </p>
        {item.note ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Your note:</span> {item.note}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Last chat {formatWhen(item.lastConversationAt)}
          {item.followUpsSent > 0
            ? ` · ${item.followUpsSent} follow-up${item.followUpsSent > 1 ? "s" : ""} sent, no reply yet`
            : ""}
          {item.followUpStatus === "SENT" && item.lastFollowUpSentAt
            ? ` · last sent ${formatWhen(item.lastFollowUpSentAt)}`
            : ""}
        </p>

        {!closed ? (
          <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {scheduled
                  ? "Follow-up planned"
                  : suggested
                    ? "AI suggestion — waiting for your approval"
                    : "No follow-up planned"}
              </span>
              {scheduled || suggested ? (
                <Badge variant="secondary">{item.manualLock ? "You control" : "AI controls"}</Badge>
              ) : null}
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-auto text-sm"
                aria-label="Follow-up date and time"
              />
            </div>
            <FollowUpMessageField
              message={message}
              onMessageChange={setMessage}
              templateId={templateId}
              onTemplateChange={setTemplateId}
            />
            <div className="flex flex-wrap gap-2">
              {(dirty || !scheduled) && hasContent && date ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null || !item.canSend}
                  onClick={() =>
                    patch(
                      "save",
                      // Approving untouched keeps the AI in control; edits make it your plan.
                      dirty
                        ? {
                            followUpAt: fromLocalInput(date),
                            followUpMessage: message,
                            followUpTemplateId: templateId,
                            followUpStatus: "SCHEDULED",
                          }
                        : { followUpStatus: "SCHEDULED" },
                      suggested && !dirty ? "Follow-up approved" : "Follow-up saved"
                    )
                  }
                >
                  {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {scheduled ? "Save changes" : suggested ? "Approve" : "Schedule"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null || !item.canSend || !hasContent}
                onClick={sendNow}
              >
                {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send now
              </Button>
              {scheduled || suggested ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() =>
                    patch("cancel", { followUpStatus: "CANCELED" }, "Follow-up cancelled")
                  }
                >
                  <XCircle className="size-4" />
                  Not needed
                </Button>
              ) : null}
              {item.manualLock && item.source === "AI" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => patch("unlock", { manualLock: false }, "The AI will plan this one again")}
                >
                  Let AI plan
                </Button>
              ) : null}
            </div>
            {!item.canSend ? (
              <p className="text-xs text-muted-foreground">
                No phone number is known for this contact, so it cannot be messaged from here.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.stage !== "CONVERTED" ? (
            <Button
              type="button"
              size="sm"
              disabled={busy !== null}
              onClick={() => patch("convert", { stage: "CONVERTED" }, "Marked as converted")}
            >
              {busy === "convert" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Converted
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => patch("reopen", { stage: "INTERESTED" }, "Moved back to interested")}
            >
              Reopen
            </Button>
          )}
          {item.stage !== "LOST" && item.stage !== "CONVERTED" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => patch("lost", { stage: "LOST" }, "Marked as not interested")}
            >
              Not interested
            </Button>
          ) : null}
          {item.needsHuman ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => patch("handled", { needsHuman: false }, "Marked as handled")}
            >
              Handled
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            disabled={busy !== null}
            onClick={remove}
          >
            {busy === "remove" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FollowUpsClient() {
  const { routeKey } = useSessionIdentity();
  const [view, setView] = React.useState<FollowUpView>("today");
  const [loaded, setLoaded] = React.useState<{ key: string; items: FollowUpApi[] } | null>(null);

  const [reloadTick, setReloadTick] = React.useState(0);
  const [adding, setAdding] = React.useState(false);
  const [approvingAll, setApprovingAll] = React.useState(false);

  const requestKey = `${view}|${routeKey}|${reloadTick}`;
  const loading = loaded?.key !== requestKey;
  const items = loaded && loaded.key === requestKey ? loaded.items : [];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let result: FollowUpApi[] = [];
      try {
        const qs = new URLSearchParams({ view });
        if (view === "today") qs.set("since", startOfLocalDayIso());
        const res = await apiJson<FollowUpsListResponse>(`/v1/follow-ups?${qs.toString()}`);
        result = res.items;
      } catch (err) {
        if (!cancelled) {
          toast.error("Load failed", { description: errMessage(err, "Could not load follow-ups.") });
        }
      }
      if (!cancelled) setLoaded({ key: requestKey, items: result });
    })();
    return () => {
      cancelled = true;
    };
  }, [view, requestKey]);

  function replaceItem(next: FollowUpApi) {
    setLoaded((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (i.id === next.id ? next : i)) } : prev
    );
  }

  function removeItem(id: string) {
    setLoaded((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev));
  }

  async function approveAll() {
    if (!window.confirm("Approve every AI suggestion in this list?")) return;
    setApprovingAll(true);
    try {
      const res = await apiJson<{ approved: number }>("/v1/follow-ups/approve-all", { method: "POST" });
      toast.success(`${res.approved} follow-up${res.approved === 1 ? "" : "s"} approved`);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error("Could not approve", { description: errMessage(err, "Please try again.") });
    } finally {
      setApprovingAll(false);
    }
  }

  const current = VIEWS.find((v) => v.id === view);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Follow-ups
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your follow-up list. Add any number yourself, or let the AI suggest a date and
            message after each chat. Mark anyone who already bought as Converted.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add to follow-up
        </Button>
      </div>

      <FollowUpSettingsCard />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button
            key={v.id}
            type="button"
            size="sm"
            variant={view === v.id ? "default" : "outline"}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {current ? <p className="text-xs text-muted-foreground">{current.hint}</p> : <span />}
        {view === "suggested" && items.length > 0 ? (
          <Button type="button" size="sm" variant="secondary" disabled={approvingAll} onClick={approveAll}>
            {approvingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Approve all
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <ListEmptyState
          icon={CalendarClock}
          title="Nothing here yet"
          description="Add a number yourself, or wait for the AI: chats appear about two hours after its last reply."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FollowUpCard
              // Remount when the saved plan changes so the edit boxes reset to the server values.
              key={`${item.id}|${item.followUpAt}|${item.followUpMessage}|${item.followUpTemplateId}|${item.followUpStatus}`}
              item={item}
              onChange={replaceItem}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}

      {adding ? (
        <AddFollowUpDialog
          onClose={() => setAdding(false)}
          onAdded={() => {
            // Show the new entry where it lives: the Scheduled list.
            if (view === "scheduled") setReloadTick((t) => t + 1);
            else setView("scheduled");
          }}
        />
      ) : null}
    </div>
  );
}
