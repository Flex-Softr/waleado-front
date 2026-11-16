"use client";

import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Send,
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
import { ApiError, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const VIEWS: { id: FollowUpView; label: string; hint: string }[] = [
  { id: "today", label: "Today", hint: "Conversations from today" },
  { id: "scheduled", label: "Scheduled", hint: "Follow-ups waiting to go out" },
  { id: "converted", label: "Converted", hint: "Customers who bought" },
  { id: "all", label: "All", hint: "Everyone the AI talked to" },
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
}: {
  item: FollowUpApi;
  onChange: (next: FollowUpApi) => void;
}) {
  const [date, setDate] = React.useState(toLocalInput(item.followUpAt));
  const [message, setMessage] = React.useState(item.followUpMessage ?? "");
  const [busy, setBusy] = React.useState<string | null>(null);

  const closed = item.stage === "CONVERTED" || item.stage === "LOST";
  const scheduled = item.followUpStatus === "SCHEDULED";
  const dirty =
    date !== toLocalInput(item.followUpAt) ||
    message.trim() !== (item.followUpMessage ?? "").trim();

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

  async function sendNow() {
    if (!window.confirm(`Send this follow-up to ${item.displayTitle} now?`)) return;
    setBusy("send");
    try {
      // Save any edits first so the saved text is exactly what gets sent.
      if (dirty) {
        const saved = await apiJson<FollowUpMutationResponse>(`/v1/follow-ups/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpMessage: message, followUpAt: fromLocalInput(date) }),
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
            <Badge variant="secondary" className={STAGE_STYLE[item.stage]}>
              {STAGE_LABEL[item.stage]}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">
          {item.summary || "No summary yet."}
        </p>
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
                {scheduled ? "Follow-up planned" : "No follow-up planned"}
              </span>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-auto text-sm"
                aria-label="Follow-up date and time"
              />
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to send on that day"
              rows={3}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(dirty || !scheduled) && message.trim() && date ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null || !item.canSend}
                  onClick={() =>
                    patch(
                      "save",
                      {
                        followUpAt: fromLocalInput(date),
                        followUpMessage: message,
                        followUpStatus: "SCHEDULED",
                      },
                      "Follow-up saved"
                    )
                  }
                >
                  {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {scheduled ? "Save changes" : "Schedule"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null || !item.canSend || !message.trim()}
                onClick={sendNow}
              >
                {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send now
              </Button>
              {scheduled ? (
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
        </div>
      </CardContent>
    </Card>
  );
}

export function FollowUpsClient() {
  const { routeKey } = useSessionIdentity();
  const [view, setView] = React.useState<FollowUpView>("today");
  const [loaded, setLoaded] = React.useState<{ key: string; items: FollowUpApi[] } | null>(null);

  const requestKey = `${view}|${routeKey}`;
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

  const current = VIEWS.find((v) => v.id === view);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Follow-ups
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          After each AI conversation, the AI writes a summary, picks a follow-up date and drafts
          the message. Check the list here and mark anyone who already bought as Converted.
        </p>
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
      {current ? <p className="text-xs text-muted-foreground">{current.hint}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <ListEmptyState
          icon={CalendarClock}
          title="Nothing here yet"
          description="Conversations appear about two hours after the AI's last reply with a customer."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FollowUpCard
              // Remount when the saved plan changes so the edit boxes reset to the server values.
              key={`${item.id}|${item.followUpAt}|${item.followUpMessage}|${item.followUpStatus}`}
              item={item}
              onChange={replaceItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
