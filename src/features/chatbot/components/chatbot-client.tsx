"use client";

import * as React from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ChatbotFlowsTable } from "@/features/chatbot/components/chatbot-flows-table";
import { CreateChatbotFlowDialog } from "@/features/chatbot/components/create-chatbot-flow-dialog";
import { flowApiToUi } from "@/features/chatbot/lib/chatbot-map";
import { DeviceConnectionAlert } from "@/features/shared/components/device-connection-alert";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { StatCard } from "@/features/shared/components/stat-card";
import type { ChatbotFlow } from "@/types/chatbot";
import type {
  ChatbotFlowMutationResponse,
  ChatbotFlowsListResponse,
} from "@/types/chatbot-api";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FlowFilter = "all" | "active" | "inactive";

export function ChatbotClient() {
  const { userId, workspaceId, routeKey } = useSessionIdentity();
  const [flows, setFlows] = React.useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FlowFilter>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingFlow, setEditingFlow] = React.useState<ChatbotFlow | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = React.useState<ChatbotFlow | null>(
    null
  );
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

  const loadFlows = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiJson<ChatbotFlowsListResponse>(
        "/v1/chatbot-flows"
      );
      setFlows(data.flows.map(flowApiToUi));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load chatbot flows.";
      toast.error("Load failed", { description: msg });
      setFlows([]);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFlows();
  }, [loadFlows, userId, workspaceId, routeKey]);

  const stats = React.useMemo(() => {
    const total = flows.length;
    const active = flows.filter((f) => f.active).length;
    const inactive = total - active;
    const totalNodes = flows.reduce((acc, f) => acc + f.nodes.length, 0);
    const conversations = flows.reduce(
      (acc, f) => acc + f.conversationCount,
      0
    );
    return { total, active, inactive, totalNodes, conversations };
  }, [flows]);

  const visible = React.useMemo(() => {
    let list = flows;
    if (filter === "active") list = list.filter((f) => f.active);
    if (filter === "inactive") list = list.filter((f) => !f.active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => {
        const desc = f.description.toLowerCase();
        const kw = f.triggerKeywords.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          desc.includes(q) ||
          kw.includes(q) ||
          f.deviceLabel.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [flows, filter, search]);
  const pagination = usePagination({
    totalItems: visible.length,
    initialPageSize: 10,
  });
  const pagedFlows = pagination.slice(visible);

  function openCreate() {
    setEditingFlow(null);
    setCreateOpen(true);
  }

  function openEdit(flow: ChatbotFlow) {
    setEditingFlow(flow);
    setCreateOpen(true);
  }

  async function handleToggleActive(flow: ChatbotFlow, active: boolean) {
    if (flow.active === active) return;
    setTogglingId(flow.id);
    try {
      const res = await apiJson<ChatbotFlowMutationResponse>(
        `/v1/chatbot-flows/${flow.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        }
      );
      const updated = flowApiToUi(res.flow);
      setFlows((prev) =>
        prev.map((f) => (f.id === flow.id ? updated : f))
      );
      toast.success(active ? "Flow enabled" : "Flow disabled", {
        description: `“${flow.name}” is ${active ? "now active" : "turned off"}.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not update flow.";
      toast.error("Update failed", { description: msg });
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDeleteFlow() {
    if (!deleteTarget) return;
    const flow = deleteTarget;
    try {
      await apiJson(`/v1/chatbot-flows/${flow.id}`, { method: "DELETE" });
      setFlows((prev) => prev.filter((f) => f.id !== flow.id));
      toast.success("Flow removed", {
        description: `“${flow.name}” deleted.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete flow.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-7">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Chatbot
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage stored WhatsApp conversation flows. Runtime logic can come later.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4"
              disabled={loading || refreshing}
              onClick={() => void loadFlows({ silent: true })}
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary/90"
              disabled={!hasConnectedDevice || loading}
              onClick={() => openCreate()}
            >
              <Plus className="size-4" />
              Create Flow
            </Button>
          </div>
        </div>

        {!hasConnectedDevice && !devicesLoading ? (
          <DeviceConnectionAlert
            title="No WhatsApp Device Connected"
            description="Chatbot flows require an active, connected WhatsApp device to interact with contacts and run automated logic. Please connect a device under Devices to get started."
            actionText="Connect Device"
            actionHref="/devices"
          />
        ) : null}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows..."
              className="h-10 rounded-md pl-10"
              aria-label="Search flows"
            />
          </div>
          <Select
            value={filter}
            onValueChange={(v) => setFilter((v ?? "all") as FlowFilter)}
            items={[
              { value: "all", label: "All Flows" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          >
            <SelectTrigger className="h-10 w-full rounded-md sm:w-[200px]">
              <SelectValue placeholder="All Flows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Flows</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total Flows"
            value={stats.total}
            icon={MessageSquare}
            accent="blue"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={Play}
            accent="green"
          />
          <StatCard
            label="Inactive"
            value={stats.inactive}
            icon={Pause}
            accent="amber"
          />
          <StatCard
            label="Total Nodes"
            value={stats.totalNodes}
            icon={Zap}
            accent="violet"
          />
          <StatCard
            label="Conversations"
            value={stats.conversations}
            icon={CheckCircle2}
            accent="violet"
          />
        </div>

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="size-9 animate-spin text-foreground dark:text-muted-foreground" />
                <p className="text-sm">Loading flows...</p>
              </div>
            ) : flows.length === 0 ? (
              <div className="px-6 pb-10 pt-6 sm:px-8">
                <ListEmptyState
                  icon={MessageSquare}
                  title="No chatbot flows yet"
                  description="Create your first chatbot flow to start automated conversations."
                  className="py-14 sm:py-20"
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    className="h-10 rounded-md bg-primary px-5 font-semibold text-white hover:bg-primary/90"
                    onClick={() => openCreate()}
                  >
                    <Plus className="size-4" />
                    Create Flow
                  </Button>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                No flows match your search or filter.
              </div>
            ) : (
              <ChatbotFlowsTable
                flows={pagedFlows}
                togglingId={togglingId}
                onToggleActive={(f, a) => void handleToggleActive(f, a)}
                onEdit={openEdit}
                onDelete={(f) => setDeleteTarget(f)}
              />
            )}
            {!loading && visible.length > 0 ? (
              <TablePagination {...pagination} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CreateChatbotFlowDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setEditingFlow(null);
        }}
        editingFlow={editingFlow}
        onSaved={() => void loadFlows({ silent: true })}
      />

      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete chatbot flow?"
        description={
          <>
            Remove{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            and all of its nodes? This cannot be undone.
          </>
        }
        confirmLabel="Delete flow"
        onConfirm={confirmDeleteFlow}
      />
    </>
  );
}
