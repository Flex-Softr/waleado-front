"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateBulkCampaignDialog } from "@/features/bulk-messages/components/create-bulk-campaign-dialog";
import {
  bulkSelectionLabel,
  deviceModeLabel,
  formatBulkCampaignWhen,
} from "@/features/bulk-messages/lib/bulk-campaign-format";
import type {
  BulkCampaignListItemApi,
  BulkCampaignsListResponse,
} from "@/types/bulk-campaign-api";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiJson } from "@/lib/api";
import { DeviceConnectionAlert } from "@/features/shared/components/device-connection-alert";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { StatCard } from "@/features/shared/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";

function statusBadge(status: BulkCampaignListItemApi["status"]) {
  if (status === "completed") {
    return (
      <Badge className="rounded-md border-emerald-200 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Completed
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge className="rounded-md border-red-200 bg-red-50 font-medium text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Failed
      </Badge>
    );
  }

  if (status === "running") {
    return (
      <Badge className="rounded-md border-blue-200 bg-blue-50 font-medium text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Running
      </Badge>
    );
  }

  if (status === "paused") {
    return (
      <Badge className="rounded-md border-slate-200 bg-slate-100 font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        Paused
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge className="rounded-md border-orange-200 bg-orange-50 font-medium text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
        Pending
      </Badge>
    );
  }

  return (
    <Badge className="rounded-md border-amber-200 bg-amber-50 font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      Scheduled
    </Badge>
  );
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return "ETA unavailable";
  if (seconds < 60) return `ETA ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `ETA ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `ETA ${hours}h${rest ? ` ${rest}m` : ""}`;
}

function ActiveCampaignMetric({
  icon: Icon,
  label,
  tone = "slate",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : tone === "red"
          ? "border-red-100 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium tabular-nums ${toneClass}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export function BulkMessagesClient() {
  const { userId, workspaceId, routeKey } = useSessionIdentity();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<BulkCampaignListItemApi[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [devices, setDevices] = React.useState<DeviceApiRecord[]>([]);
  const [devicesLoading, setDevicesLoading] = React.useState(true);

  const loadDevices = React.useCallback(async () => {
    setDevicesLoading(true);
    try {
      const data = await apiJson<DevicesListResponse>("/v1/devices");
      setDevices(data.devices);
    } catch {
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDevices();
  }, [loadDevices, userId, workspaceId, routeKey]);

  const connectedDevices = React.useMemo(
    () => devices.filter((d) => d.status === "connected"),
    [devices]
  );
  const hasConnectedDevice = connectedDevices.length > 0;

  const [statusFilter, setStatusFilter] = React.useState("all");
  const [actionBusyId, setActionBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<BulkCampaignListItemApi | null>(null);

  const loadCampaigns = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await apiJson<BulkCampaignsListResponse>("/v1/bulk-campaigns");
      setCampaigns(data.campaigns);
    } catch (err) {
      //console.error(err);
    
      const msg =
        err instanceof ApiError ? err.message : "Could not load campaigns.";
    
      toast.error("Load failed", { description: msg });
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns, userId, workspaceId, routeKey]);

  const hasActiveCampaigns = React.useMemo(
    () =>
      campaigns.some(
        (c) => c.status === "running" || c.status === "pending"
      ),
    [campaigns]
  );

  React.useEffect(() => {
    if (!hasActiveCampaigns) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadCampaigns({ silent: true });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [hasActiveCampaigns, loadCampaigns]);

  async function updateCampaignStatus(
    campaign: BulkCampaignListItemApi,
    action: "pause" | "resume"
  ) {
    setActionBusyId(campaign.id);
    try {
      const out = await apiJson<{ campaign: BulkCampaignListItemApi }>(
        `/v1/bulk-campaigns/${campaign.id}/${action}`,
        { method: "PATCH" }
      );
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? out.campaign : item))
      );
      toast.success(action === "pause" ? "Campaign paused" : "Campaign resumed", {
        description: campaign.name,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : `Could not ${action} campaign.`;
      toast.error("Action failed", { description: msg });
    } finally {
      setActionBusyId(null);
    }
  }

  async function deleteCampaign(campaign: BulkCampaignListItemApi) {
    try {
      await apiJson(`/v1/bulk-campaigns/${campaign.id}`, { method: "DELETE" });
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      toast.success("Campaign deleted", { description: campaign.name });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete campaign.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  const stats = React.useMemo(() => {
    const totalRecipients = campaigns.reduce((a, c) => a + c.recipientCount, 0);
    const completed = campaigns.filter((c) => c.status === "completed").length;
    const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
    const failed = campaigns.filter((c) => c.status === "failed").length;
    return {
      totalRecipients,
      completed,
      scheduled,
      failed,
    };
  }, [campaigns]);

  const runningCampaigns = React.useMemo(
    () => campaigns.filter((c) => c.status === "running"),
    [campaigns]
  );
  
  const pendingCampaigns = React.useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.status === "pending" ||
          c.status === "scheduled" ||
          c.status === "paused"
      ),
    [campaigns]
  );
  
  const historyCampaigns = React.useMemo(() => {
    let data = campaigns.filter(
      (c) =>
        c.status !== "running" &&
        c.status !== "pending" &&
        c.status !== "scheduled" &&
        c.status !== "paused"
    );
  
    if (statusFilter !== "all") {
      data = data.filter((c) => c.status === statusFilter);
    }
  
    return data;
  }, [campaigns, statusFilter]);

  const pagination = usePagination({
    totalItems: historyCampaigns.length,
    initialPageSize: 10,
  });
  const pagedCampaigns = pagination.slice(historyCampaigns);

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-7">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-muted dark:text-foreground">
              <Megaphone className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Bulk Messages
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create, queue, pause, resume, and track WhatsApp campaigns.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-md px-4"
              disabled={loading || refreshing}
              onClick={() => void loadCampaigns({ silent: true })}
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary/90 sm:w-auto"
              disabled={!hasConnectedDevice || loading}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Create campaign
            </Button>
          </div>
        </div>

        {!hasConnectedDevice && !devicesLoading ? (
          <DeviceConnectionAlert
            title="No WhatsApp Device Connected"
            description="You need at least one connected WhatsApp device to create and launch bulk message campaigns. Please connect a device under Devices to get started."
            actionText="Connect Device"
            actionHref="/devices"
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Campaigns"
            value={campaigns.length}
            icon={Megaphone}
            accent="violet"
          />
          <StatCard
            label="Recipients (total sends)"
            value={stats.totalRecipients}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            accent="green"
          />
          <StatCard
            label="Scheduled / failed"
            value={stats.scheduled + stats.failed}
            icon={CalendarClock}
            accent="amber"
          />
        </div>


        {(runningCampaigns.length > 0 || pendingCampaigns.length > 0) && (
  <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
    <CardContent className="p-0">
      <div className="border-b border-border bg-muted/20 px-6 py-4">
        <h3 className="text-lg font-semibold">
          Active Campaigns
        </h3>
        <p className="text-sm text-muted-foreground">
          Running and queued campaigns
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead className="hidden md:table-cell">
              Schedule
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              Created
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {[...runningCampaigns, ...pendingCampaigns].map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link
                  href={`/bulk-messages/${c.id}`}
                  className="block w-full rounded-md text-left transition-colors"
                >
                  <div className="font-medium text-foreground underline-offset-4 hover:underline dark:text-muted-foreground">
                    {c.name}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {c.kind === "text" ? "Text" : "Template"} ·{" "}
                    {deviceModeLabel(c.deviceMode)}
                  </div>
                  <div className="mt-2 flex max-w-xl flex-wrap gap-1.5">
                    <ActiveCampaignMetric
                      icon={Send}
                      label={`${c.progress.sent + c.progress.failed}/${c.progress.total} processed`}
                    />
                    <ActiveCampaignMetric
                      icon={MessageSquare}
                      label={`${c.progress.replied} replied`}
                      tone="green"
                    />
                    <ActiveCampaignMetric
                      icon={Clock3}
                      label={formatEta(c.progress.etaSeconds)}
                      tone="amber"
                    />
                    {c.progress.failed > 0 ? (
                      <ActiveCampaignMetric
                        icon={AlertTriangle}
                        label={`${c.progress.failed} failed`}
                        tone="red"
                      />
                    ) : null}
                  </div>
                  <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${c.progress.percent}%` }}
                    />
                  </div>
                </Link>
              </TableCell>

              <TableCell>{statusBadge(c.status)}</TableCell>

              <TableCell>{c.recipientCount}</TableCell>

              <TableCell className="hidden md:table-cell text-muted-foreground">
                {c.scheduleType === "scheduled" && c.scheduledAt
                  ? formatBulkCampaignWhen(c.scheduledAt)
                  : "Immediate"}
              </TableCell>

              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {formatBulkCampaignWhen(c.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {c.status === "paused" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Resume campaign"
                      disabled={actionBusyId === c.id}
                      onClick={() => void updateCampaignStatus(c, "resume")}
                    >
                      <Play className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Pause campaign"
                      disabled={actionBusyId === c.id}
                      onClick={() => void updateCampaignStatus(c, "pause")}
                    >
                      <Pause className="size-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete campaign"
                    disabled={actionBusyId === c.id}
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}


        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="size-9 animate-spin text-foreground dark:text-muted-foreground" />
                <p className="text-sm">Loading campaigns…</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-6 sm:p-8 lg:p-10">
                <ListEmptyState
                  icon={Megaphone}
                  title="No campaigns yet"
                  description="Create a bulk campaign to reach your audience. Pull sessions from Devices, templates from Templates, and verified contacts from Contacts."
                />
              </div>
            ) : (
              <>
              <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h3 className="text-lg font-semibold">
      Campaign History
    </h3>
    <p className="text-sm text-muted-foreground">
      Completed, failed and archived campaigns
    </p>
  </div>

  <Select
    value={statusFilter}
    onValueChange={(value) => setStatusFilter(value ?? "all")}
    items={[
      { value: "all", label: "All" },
      { value: "completed", label: "Completed" },
      { value: "failed", label: "Failed" },
    ]}
  >
    <SelectTrigger className="h-10 w-full rounded-md sm:w-[180px]">
      <SelectValue placeholder="Filter status" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="completed">Completed</SelectItem>
      <SelectItem value="failed">Failed</SelectItem>
    </SelectContent>
  </Select>
</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Recipients</TableHead>
                    <TableHead className="hidden md:table-cell">Audience</TableHead>
                    <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedCampaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/bulk-messages/${c.id}`}
                          className="block w-full rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                        >
                          <div className="font-medium text-foreground underline-offset-4 hover:underline dark:text-muted-foreground">
                            {c.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.kind === "text" ? "Text" : "Template"} ·{" "}
                            {deviceModeLabel(c.deviceMode)} · {c.delayMinSec}–
                            {c.delayMaxSec}s random · retries {c.maxRetries}
                            {c.antiBlock.enabled ? (
                              <>
                                {" "}
                                · anti-block on
                               {c.antiBlock.repliedOnly ? " · replied-only" : ""}
                                {c.antiBlock.recent24hOnly ? " · 24h-window" : ""}
                              </>
                            ) : null}
                            {c.attachmentType ? (
                              <>
                                {" "}
                                ·{" "}
                                <span className="capitalize">
                                  {c.attachmentType}
                                </span>
                                {c.attachmentFileName
                                  ? ` (${c.attachmentFileName})`
                                  : ""}
                              </>
                            ) : null}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {c.recipientCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {bulkSelectionLabel(c.selectionMode)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {c.scheduleType === "scheduled" && c.scheduledAt
                          ? formatBulkCampaignWhen(c.scheduledAt)
                          : "Immediate"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatBulkCampaignWhen(c.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete campaign"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
            {!loading && campaigns.length > 0 ? (
              <TablePagination {...pagination} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CreateBulkCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void loadCampaigns({ silent: true })}
      />
      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete campaign?"
        description={
          <>
            Delete <span className="font-medium">{deleteTarget?.name}</span> and
            remove it from campaign history.
          </>
        }
        confirmLabel="Delete campaign"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteCampaign(deleteTarget);
        }}
      />
    </>
  );
}
