"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  FlaskConical,
  Loader2,
  MessageSquare,
  Pause,
  Phone,
  Play,
  RefreshCcw,
  Server,
  Smartphone,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";

import { StatCard } from "@/features/shared/components/stat-card";
import {
  bulkSelectionLabel,
  deviceModeLabel,
  formatBulkCampaignWhen,
} from "@/features/bulk-messages/lib/bulk-campaign-format";
import type {
  BulkCampaignDetailApi,
  BulkCampaignRecipientApi,
  BulkCampaignRecipientsResponse,
  BulkCampaignRecipientStatusApi,
  CreateBulkCampaignResponse,
} from "@/types/bulk-campaign-api";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import { ApiError, apiFetch, apiJson } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
import { useControlledPagination, usePagination } from "@/hooks/use-pagination";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";

type BulkCampaignDetailPageClientProps = {
  campaignId: string;
};

const recipientStatusFilters: Array<{
  value: "all" | BulkCampaignRecipientStatusApi;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "simulated", label: "Simulated" },
];

type RecipientAudience = "failed" | "replied" | "no_reply" | "seen_no_reply";
type RecipientActionBusy =
  | "retry_failed"
  | "retry_no_reply"
  | "group_failed"
  | "group_replied"
  | null;

function statusBadgeClass(
  status: BulkCampaignDetailApi["campaign"]["status"]
) {
  if (status === "completed") {
    return "rounded-md border-emerald-200 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  }
  if (status === "failed") {
    return "rounded-md border-red-200 bg-red-50 font-medium text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200";
  }
  if (status === "running") {
    return "rounded-md border-blue-200 bg-blue-50 font-medium text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200";
  }
  if (status === "pending") {
    return "rounded-md border-orange-200 bg-orange-50 font-medium text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200";
  }
  if (status === "paused") {
    return "rounded-md border-slate-200 bg-slate-100 font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
  }
  return "rounded-md border-amber-200 bg-amber-50 font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
}

function statusLabel(status: BulkCampaignDetailApi["campaign"]["status"]) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "running") return "Running";
  if (status === "pending") return "Pending";
  if (status === "paused") return "Paused";
  return "Scheduled";
}

function outboundStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "sent") {
    return (
      <Badge className="rounded-md border-emerald-200 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Sent
      </Badge>
    );
  }
  if (s === "failed") {
    return (
      <Badge className="rounded-md border-red-200 bg-red-50 font-medium text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Failed
      </Badge>
    );
  }
  if (s === "queued") {
    return (
      <Badge className="rounded-md border-amber-200 bg-amber-50 font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Queued
      </Badge>
    );
  }
  if (s === "simulated") {
    return (
      <Badge variant="secondary" className="rounded-md font-medium">
        Simulated
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-md font-medium">
      {status}
    </Badge>
  );
}

function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-slate-800",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BulkCampaignDetailPageClient({
  campaignId,
}: BulkCampaignDetailPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [downloading, setDownloading] = React.useState(false);
  const [reportDownloading, setReportDownloading] = React.useState<
    "csv" | "xlsx" | null
  >(null);
  const [detail, setDetail] = React.useState<BulkCampaignDetailApi | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [recipientActionBusy, setRecipientActionBusy] =
    React.useState<RecipientActionBusy>(null);
  const [recipientStatusFilter, setRecipientStatusFilter] = React.useState<
    "all" | BulkCampaignRecipientStatusApi
  >("all");
  const [recipientRows, setRecipientRows] = React.useState<
    BulkCampaignRecipientApi[]
  >([]);
  const [recipientTotal, setRecipientTotal] = React.useState(0);
  const [recipientPage, setRecipientPage] = React.useState(1);
  const [recipientPageSize, setRecipientPageSize] = React.useState(25);
  const [recipientsLoading, setRecipientsLoading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const loadDetail = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const data = await apiJson<BulkCampaignDetailApi>(
        `/v1/bulk-campaigns/${campaignId}`
      );
      setDetail(data);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load campaign.";
      setLoadError(msg);
      setDetail(null);
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [campaignId]);

  const loadRecipients = React.useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(recipientPage),
        pageSize: String(recipientPageSize),
      });
      if (recipientStatusFilter !== "all") {
        params.set("status", recipientStatusFilter);
      }
      const data = await apiJson<BulkCampaignRecipientsResponse>(
        `/v1/bulk-campaigns/${campaignId}/recipients?${params.toString()}`
      );
      setRecipientRows(data.recipients);
      setRecipientTotal(data.total);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load recipients.";
      toast.error("Recipients failed", { description: msg });
    } finally {
      setRecipientsLoading(false);
    }
  }, [campaignId, recipientPage, recipientPageSize, recipientStatusFilter]);

  React.useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void apiJson<BulkCampaignDetailApi>(`/v1/bulk-campaigns/${campaignId}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err instanceof ApiError ? err.message : "Could not load campaign.";
          setLoadError(msg);
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, pathname]);

  const isCampaignActive =
    detail?.campaign?.status === "running" ||
    detail?.campaign?.status === "pending";

  React.useEffect(() => {
    if (!isCampaignActive) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadDetail({ silent: true });
      void loadRecipients();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [isCampaignActive, loadDetail, loadRecipients]);

  async function updateCampaignStatus(action: "pause" | "resume") {
    setActionBusy(true);
    try {
      await apiJson(`/v1/bulk-campaigns/${campaignId}/${action}`, {
        method: "PATCH",
      });
      await loadDetail({ silent: true });
      toast.success(action === "pause" ? "Campaign paused" : "Campaign resumed");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : `Could not ${action} campaign.`;
      toast.error("Action failed", { description: msg });
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteCampaign() {
    try {
      await apiJson(`/v1/bulk-campaigns/${campaignId}`, { method: "DELETE" });
      toast.success("Campaign deleted");
      router.push("/bulk-messages");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete campaign.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  async function downloadAttachment() {
    const c = detail?.campaign;
    if (!c?.attachmentAssetId || !c.attachmentFileName) return;
    setDownloading(true);
    try {
      const res = await apiFetch(`/v1/templates/media/${c.attachmentAssetId}`);
      if (!res.ok) {
        toast.error("Download failed", {
          description: "Could not load the attachment.",
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = c.attachmentFileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download saved", {
        description: c.attachmentFileName,
      });
    } finally {
      setDownloading(false);
    }
  }

  async function downloadReport(format: "csv" | "xlsx") {
    setReportDownloading(format);
    try {
      const res = await apiFetch(
        `/v1/bulk-campaigns/${campaignId}/report?format=${format}`
      );
      if (!res.ok) {
        toast.error("Report failed", {
          description: "Could not export this campaign report.",
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      a.href = url;
      a.download =
        filenameMatch?.[1] ?? `bulk-campaign-${campaignId}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported", {
        description: a.download,
      });
    } finally {
      setReportDownloading(null);
    }
  }

  function audienceLabel(audience: RecipientAudience): string {
    if (audience === "failed") return "failed";
    if (audience === "replied") return "replied";
    if (audience === "seen_no_reply") return "seen but no-reply";
    return "no-reply";
  }

  async function retryAudienceRecipients(audience: RecipientAudience) {
    setRecipientActionBusy(
      audience === "failed" ? "retry_failed" : "retry_no_reply"
    );
    try {
      const out = await apiJson<CreateBulkCampaignResponse>(
        `/v1/bulk-campaigns/${campaignId}/retry`,
        {
          method: "POST",
          body: JSON.stringify({ audience }),
        }
      );
      toast.success("Retry campaign created", {
        description: `${out.campaign.name} (${out.campaign.recipientCount} recipients)`,
      });
      router.push(`/bulk-messages/${out.campaign.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not create retry campaign.";
      toast.error("Retry failed", { description: msg });
    } finally {
      setRecipientActionBusy(null);
    }
  }

  async function createAudienceContactGroup(audience: RecipientAudience) {
    const fallback = detail?.campaign.name
      ? `${audienceLabel(audience)} - ${detail.campaign.name}`.slice(0, 80)
      : `${audienceLabel(audience)} recipients`;
    const name = window.prompt("Contact group name", fallback);
    if (!name?.trim()) return;

    setRecipientActionBusy(
      audience === "failed" ? "group_failed" : "group_replied"
    );
    try {
      const out = await apiJson<{
        group: { id: string; name: string; total: number };
        skipped: number;
      }>(`/v1/bulk-campaigns/${campaignId}/contact-group`, {
        method: "POST",
        body: JSON.stringify({ audience, name: name.trim() }),
      });
      toast.success("Contact group created", {
        description: `${out.group.name} (${out.group.total} contacts)`,
      });
      router.push(`/contacts/${out.group.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not create contact group.";
      toast.error("Group creation failed", { description: msg });
    } finally {
      setRecipientActionBusy(null);
    }
  }

  const campaign = detail?.campaign;
  const stats = detail?.stats;
  const target = stats?.targetRecipients ?? campaign?.recipientCount ?? 0;
  const sent = stats?.sent ?? 0;
  const deliveryPct =
    target > 0 ? Math.min(100, Math.round((sent / target) * 100)) : 0;
  const rowsPct =
    target > 0 && stats
      ? Math.min(100, Math.round((stats.totalOutboundRows / target) * 100))
      : 0;
  const deliveredRate =
    sent > 0 && stats ? Math.min(100, Math.round((stats.delivered / sent) * 100)) : 0;
  const seenRate =
    sent > 0 && stats ? Math.min(100, Math.round((stats.seen / sent) * 100)) : 0;
  const replyRate =
    sent > 0 && stats ? Math.min(100, Math.round((stats.replied / sent) * 100)) : 0;
  const messagePagination = usePagination({
    totalItems: detail?.recentMessages.length ?? 0,
    initialPageSize: 10,
  });
  const pagedMessages = messagePagination.slice(detail?.recentMessages ?? []);
  const recipientPagination = useControlledPagination({
    page: recipientPage,
    pageSize: recipientPageSize,
    totalItems: recipientTotal,
    onPageChange: setRecipientPage,
    onPageSizeChange: setRecipientPageSize,
  });
  const pagedRecipients = recipientRows;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 lg:space-y-7">
        {loading && !campaign ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-white py-24 text-muted-foreground shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Loader2 className="size-10 animate-spin text-foreground dark:text-muted-foreground" />
            <p className="text-sm">Loading campaign...</p>
          </div>
        ) : loadError ? (
          <Card className="rounded-lg border-destructive/40 bg-destructive/5">
            <CardContent className="px-6 py-8 text-center">
              <p className="text-destructive">{loadError}</p>
              <Button className="mt-6 rounded-md" variant="outline">
                <Link href="/bulk-messages">Return to list</Link>
              </Button>
            </CardContent>
          </Card>
        ) : campaign && stats && detail ? (
          <>
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <Link
                href="/bulk-messages"
                className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground dark:text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to bulk messages
              </Link>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                    {campaign.name}
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Delivery breakdown, devices, message content, and recipient rows.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={reportDownloading !== null}
                    onClick={() => void downloadReport("csv")}
                  >
                    {reportDownloading === "csv" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={reportDownloading !== null}
                    onClick={() => void downloadReport("xlsx")}
                  >
                    {reportDownloading === "xlsx" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    XLSX
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={recipientActionBusy !== null || stats.failed === 0}
                    onClick={() => void retryAudienceRecipients("failed")}
                  >
                    {recipientActionBusy === "retry_failed" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="size-4" />
                    )}
                    Retry Failed
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={recipientActionBusy !== null || stats.noReply === 0}
                    onClick={() => void retryAudienceRecipients("no_reply")}
                  >
                    {recipientActionBusy === "retry_no_reply" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="size-4" />
                    )}
                    Follow Up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={recipientActionBusy !== null || stats.failed === 0}
                    onClick={() => void createAudienceContactGroup("failed")}
                  >
                    {recipientActionBusy === "group_failed" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Save Failed
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md"
                    disabled={recipientActionBusy !== null || stats.replied === 0}
                    onClick={() => void createAudienceContactGroup("replied")}
                  >
                    {recipientActionBusy === "group_replied" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Save Replied
                  </Button>
                  {campaign.status === "paused" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md"
                      disabled={actionBusy}
                      onClick={() => void updateCampaignStatus("resume")}
                    >
                      <Play className="size-4" />
                      Resume
                    </Button>
                  ) : campaign.status === "completed" || campaign.status === "failed" ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md"
                      disabled={actionBusy}
                      onClick={() => void updateCampaignStatus("pause")}
                    >
                      <Pause className="size-4" />
                      Pause
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 rounded-md"
                    disabled={actionBusy}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Badge className={statusBadgeClass(campaign.status)}>
                  {statusLabel(campaign.status)}
                </Badge>
                <Badge variant="secondary" className="rounded-md font-medium">
                  {campaign.kind === "text" ? "Text" : "Template"}
                </Badge>
                <Badge variant="outline" className="rounded-md font-medium">
                  {deviceModeLabel(campaign.deviceMode)}
                </Badge>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Delivery progress
              </h2>
              <div className="space-y-3 rounded-lg border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    WhatsApp delivered (sent)
                  </span>
                  <span className="tabular-nums font-semibold">
                    {sent} / {target}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({deliveryPct}%)
                    </span>
                  </span>
                </div>
                <ProgressBar value={sent} max={target} />
                <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Outbound rows created
                  </span>
                  <span className="tabular-nums font-medium">
                    {stats.totalOutboundRows} / {target}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({rowsPct}%)
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={stats.totalOutboundRows}
                  max={target}
                  className="opacity-80"
                />
                <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800 sm:grid-cols-3">
                  <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                    <p className="text-xs text-muted-foreground">
                      Delivered rate
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {deliveredRate}%
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                    <p className="text-xs text-muted-foreground">Seen rate</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {seenRate}%
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                    <p className="text-xs text-muted-foreground">Reply rate</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {replyRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Sent"
                value={stats.sent}
                icon={CheckCircle2}
                accent="green"
              />
              <StatCard
                label="Delivered"
                value={stats.delivered}
                icon={Smartphone}
                accent="indigo"
              />
              <StatCard
                label="Seen"
                value={stats.seen}
                icon={EyeOff}
                accent="slate"
              />
              <StatCard
                label="Replied"
                value={stats.replied}
                icon={MessageSquare}
                accent="green"
              />
              <StatCard
                label="No reply"
                value={stats.noReply}
                icon={Phone}
                accent="amber"
              />
              <StatCard
                label="Failed"
                value={stats.failed}
                icon={XCircle}
                accent="red"
              />
              <StatCard
                label="In queue"
                value={stats.pendingInQueue}
                icon={Clock}
                accent="amber"
              />
              <StatCard
                label="Simulated"
                value={stats.simulated}
                icon={FlaskConical}
                accent="slate"
              />
              <StatCard
                label="Not dispatched yet"
                value={stats.notDispatchedYet}
                icon={Server}
                accent="indigo"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Delivered and seen depend on WhatsApp receipt events and recipient
              privacy settings. Replied is based on inbound messages matched to
              this campaign.
            </p>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card size="sm" className="rounded-lg border-border shadow-sm dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="size-4" />
                    Schedule &amp; dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-right font-medium">
                      {formatBulkCampaignWhen(campaign.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-right font-medium">
                      {formatBulkCampaignWhen(campaign.updatedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Send</span>
                    <span className="text-right font-medium">
                      {campaign.scheduleType === "scheduled" &&
                      campaign.scheduledAt
                        ? formatBulkCampaignWhen(campaign.scheduledAt)
                        : "Immediate"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Audience</span>
                    <span className="text-right font-medium">
                      {bulkSelectionLabel(campaign.selectionMode)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Delay</span>
                    <span className="text-right tabular-nums">
                      {campaign.delayMinSec}–{campaign.delayMaxSec}s random
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Timezone</span>
                    <span className="text-right font-medium">
                      {campaign.timezone ?? campaign.antiBlock.timezone ?? "Server local"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Retries</span>
                    <span className="text-right tabular-nums">
                      up to {campaign.maxRetries}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Anti-block</span>
                    <span className="text-right font-medium">
                      {campaign.antiBlock.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {campaign.antiBlock.enabled ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Uniqueness</span>
                        <span className="text-right font-medium">
                          {campaign.antiBlock.uniquenessMode.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Batch pause</span>
                        <span className="text-right tabular-nums">
                          every {campaign.antiBlock.batchPauseEvery} msgs,{" "}
                          {campaign.antiBlock.batchPauseSec}s wait
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Fail limit</span>
                        <span className="text-right tabular-nums">
                          {campaign.antiBlock.failLimitInRow} in a row
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Active hours</span>
                        <span className="text-right tabular-nums">
                          {campaign.antiBlock.activeHoursStart &&
                          campaign.antiBlock.activeHoursEnd
                            ? `${campaign.antiBlock.activeHoursStart} - ${campaign.antiBlock.activeHoursEnd}`
                            : "Any time"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Inactive time</span>
                        <span className="text-right tabular-nums">
                          {campaign.antiBlock.inactiveHoursStart &&
                          campaign.antiBlock.inactiveHoursEnd
                            ? `${campaign.antiBlock.inactiveHoursStart} - ${campaign.antiBlock.inactiveHoursEnd}`
                            : "None"}
                        </span>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card size="sm" className="rounded-lg border-border shadow-sm dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="size-4" />
                    Message content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  {campaign.kind === "template" ? (
                    detail.template ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Template
                        </p>
                        <p className="mt-1 font-medium">{detail.template.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Type: {detail.template.typeId.replace(/_/g, " ")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Template metadata unavailable.
                      </p>
                    )
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {detail.bodyTexts && detail.bodyTexts.length > 1
                          ? `Text variants (${detail.bodyTexts.length})`
                          : "Text body"}
                      </p>
                      {detail.bodyTexts && detail.bodyTexts.length > 0 ? (
                        <ul className="space-y-3">
                          {detail.bodyTexts.map((text, index) => (
                            <li
                              key={`${index}-${text.slice(0, 24)}`}
                              className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"
                            >
                              {detail.bodyTexts && detail.bodyTexts.length > 1 ? (
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Variant {index + 1}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                {text.trim() || "—"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                          {detail.messagePreview?.trim() || "—"}
                        </p>
                      )}
                    </div>
                  )}
                  {campaign.attachmentType ? (
                    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        Attachment
                      </p>
                      <p className="mt-1 capitalize">
                        {campaign.attachmentType}
                        {campaign.attachmentFileName
                          ? ` · ${campaign.attachmentFileName}`
                          : ""}
                      </p>
                      {campaign.attachmentAssetId &&
                      campaign.attachmentFileName ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 rounded-md"
                          disabled={downloading}
                          onClick={() => void downloadAttachment()}
                        >
                          {downloading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          Download
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card size="sm" className="rounded-xl border-border bg-card shadow-xs">
              <CardHeader className="border-b border-border bg-muted/20 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="size-4" />
                  Devices in campaign
                </CardTitle>
                <CardDescription>
                  Sessions selected when the campaign was created. Stats show
                  sends per device.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <ul className="flex flex-wrap gap-2">
                  {detail.devices.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{d.name}</span>
                      {d.phone ? (
                        <span className="text-muted-foreground">· {d.phone}</span>
                      ) : null}
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        {d.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {detail.deviceSendStats.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead className="text-right">Sent</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Queued</TableHead>
                          <TableHead className="text-right">Sim.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.deviceSendStats.map((r) => (
                          <TableRow key={r.deviceId}>
                            <TableCell className="font-medium">
                              <div>{r.deviceName}</div>
                              {r.phone ? (
                                <div className="text-xs text-muted-foreground">
                                  {r.phone}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.sent}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.failed}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.queued}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.simulated}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {r.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card size="sm" className="overflow-hidden rounded-xl border-border bg-card shadow-xs">
              <CardHeader className="border-b border-border bg-muted/20 pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Recipient progress
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({recipientTotal} total)
                      </span>
                    </CardTitle>
                    <CardDescription>
                      One row per campaign recipient. Export CSV or XLSX for the full
                      report.
                    </CardDescription>
                  </div>
                  {recipientTotal > 0 || recipientStatusFilter !== "all" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {recipientStatusFilters.map((item) => (
                        <Button
                          key={item.value}
                          type="button"
                          variant={
                            recipientStatusFilter === item.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-8 rounded-md px-2.5"
                          onClick={() => {
                            setRecipientStatusFilter(item.value);
                            setRecipientPage(1);
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="px-0 pt-0">
                {target > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Device
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            Attempts
                          </TableHead>
                          <TableHead className="hidden lg:table-cell">
                            Last update
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipientsLoading && pagedRecipients.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-sm text-muted-foreground"
                            >
                              Loading recipients...
                            </TableCell>
                          </TableRow>
                        ) : pagedRecipients.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-sm text-muted-foreground"
                            >
                              No recipients match this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedRecipients.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="align-top font-mono text-xs">
                              {r.phone}
                              {r.lastError ? (
                                <div className="mt-1 max-w-[220px] text-[11px] font-sans text-destructive sm:max-w-md">
                                  {r.lastError}
                                </div>
                              ) : null}
                              {r.lastReplyText ? (
                                <div className="mt-1 max-w-[220px] text-[11px] font-sans text-emerald-700 dark:text-emerald-300 sm:max-w-md">
                                  Reply: {r.lastReplyText}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="align-top">
                              {outboundStatusBadge(r.status)}
                            </TableCell>
                            <TableCell className="hidden align-top text-sm sm:table-cell">
                              {r.deviceName ?? "-"}
                            </TableCell>
                            <TableCell className="hidden align-top tabular-nums md:table-cell">
                              {r.attempts}
                            </TableCell>
                            <TableCell className="hidden align-top text-xs text-muted-foreground lg:table-cell">
                              {formatBulkCampaignWhen(
                                r.lastReplyAt ??
                                  r.repliedAt ??
                                  r.seenAt ??
                                  r.deliveredAt ??
                                  r.sentAt ??
                                  r.failedAt ??
                                  r.queuedAt ??
                                  r.createdAt
                              )}
                            </TableCell>
                          </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <TablePagination
                      {...recipientPagination}
                      className="px-4 sm:px-4"
                      disabled={recipientsLoading}
                    />
                  </div>
                ) : detail.recentMessages.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No outbound rows yet (e.g. scheduled campaign not started,
                    or still queuing).
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Device
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            Time
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedMessages.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="align-top font-mono text-xs">
                              {m.toPhone}
                              {m.errorMessage ? (
                                <div className="mt-1 max-w-[220px] text-[11px] font-sans text-destructive sm:max-w-md">
                                  {m.errorMessage}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="align-top">
                              {outboundStatusBadge(m.status)}
                            </TableCell>
                            <TableCell className="hidden align-top text-sm sm:table-cell">
                              <div>{m.deviceName}</div>
                              {m.devicePhone ? (
                                <div className="text-xs text-muted-foreground">
                                  {m.devicePhone}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="hidden align-top text-xs text-muted-foreground md:table-cell">
                              {formatBulkCampaignWhen(m.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      {...messagePagination}
                      className="px-4 sm:px-4"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      <ConfirmDestructiveDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete campaign?"
        description={
          <>
            Delete <span className="font-medium">{campaign?.name}</span> and
            remove it from campaign history.
          </>
        }
        confirmLabel="Delete campaign"
        onConfirm={deleteCampaign}
      />
    </div>
  );
}
