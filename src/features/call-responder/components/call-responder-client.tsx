"use client";

import * as React from "react";
import {
  Clock,
  Loader2,
  MessageSquare,
  Phone,
  PhoneMissed,
  Play,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { CallResponderRulesTable } from "@/features/call-responder/components/call-responder-rules-table";
import { CreateCallResponderRuleDialog } from "@/features/call-responder/components/create-call-responder-rule-dialog";
import { DeviceConnectionAlert } from "@/features/shared/components/device-connection-alert";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { StatCard } from "@/features/shared/components/stat-card";
import type { CallResponderRule } from "@/types/call-responder";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import type {
  MessageTemplateApiRecord,
  TemplatesListResponse,
} from "@/types/templates-api";
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
import { ApiError, apiJson } from "@/lib/api";

type CallResponderRulesResponse = {
  rules: CallResponderRule[];
};

type CreateCallResponderRuleResponse = {
  rule: CallResponderRule;
};

type RuleFilter = "all" | "active" | "inactive";

export function CallResponderClient() {
  const [rules, setRules] = React.useState<CallResponderRule[]>([]);
  const [devices, setDevices] = React.useState<DeviceApiRecord[]>([]);
  const [templates, setTemplates] = React.useState<MessageTemplateApiRecord[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);
  const [editingRule, setEditingRule] =
    React.useState<CallResponderRule | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<CallResponderRule | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<RuleFilter>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [rulesData, devicesData, templatesData] = await Promise.all([
          apiJson<CallResponderRulesResponse>("/v1/call-responder-rules"),
          apiJson<DevicesListResponse>("/v1/devices"),
          apiJson<TemplatesListResponse>("/v1/templates"),
        ]);
        if (cancelled) return;
        setRules(rulesData.rules);
        setDevices(devicesData.devices);
        setTemplates(
          templatesData.templates.filter((template) => template.active !== false)
        );
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "Could not load call responder.";
        toast.error("Call responder unavailable", { description: msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connectedDevices = React.useMemo(
    () => devices.filter((d) => d.status === "connected"),
    [devices]
  );
  const hasConnectedDevice = connectedDevices.length > 0;

  const stats = React.useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.active).length;
    const inactive = total - active;
    const responsesSent = rules.reduce((acc, r) => acc + r.responsesSent, 0);
    const callsToday = rules.reduce((acc, r) => acc + r.callsToday, 0);
    return { total, active, inactive, responsesSent, callsToday };
  }, [rules]);

  const visible = React.useMemo(() => {
    let list = rules;
    if (filter === "active") list = list.filter((r) => r.active);
    if (filter === "inactive") list = list.filter((r) => !r.active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const body = (r.messageBody ?? "").toLowerCase();
        const tmpl = (r.templateName ?? "").toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.deviceLabel.toLowerCase().includes(q) ||
          body.includes(q) ||
          tmpl.includes(q)
        );
      });
    }
    return list;
  }, [rules, filter, search]);
  const pagination = usePagination({
    totalItems: visible.length,
    initialPageSize: 10,
  });
  const pagedRules = pagination.slice(visible);

  function handleCallLogs() {
    toast.message("Call logs", {
      description: "Call responder automatically logs sent outbound replies into Live Chat and Outbound Messages.",
    });
  }

  async function handleSaveRule(input: {
    id?: string;
    name: string;
    deviceId: string;
    callTypes: CallResponderRule["callTypes"];
    responseDelayMinutes: number;
    messageFormType: CallResponderRule["messageFormType"];
    messageBody?: string | null;
    templateId?: string | null;
  }) {
    try {
      if (input.id) {
        const data = await apiJson<{ rule: CallResponderRule }>(
          `/v1/call-responder-rules/${input.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );
        setRules((prev) =>
          prev.map((r) => (r.id === data.rule.id ? data.rule : r))
        );
        toast.success("Rule updated", {
          description: `“${data.rule.name}” has been updated.`,
        });
        return data.rule;
      } else {
        const data = await apiJson<CreateCallResponderRuleResponse>(
          "/v1/call-responder-rules",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );
        setRules((prev) => [data.rule, ...prev]);
        toast.success("Rule created", {
          description: `“${data.rule.name}” is active.`,
        });
        return data.rule;
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not save rule.";
      toast.error("Save failed", { description: msg });
      throw err;
    }
  }

  async function handleToggleRuleActive(
    rule: CallResponderRule,
    nextActive: boolean
  ) {
    try {
      const data = await apiJson<{ rule: CallResponderRule }>(
        `/v1/call-responder-rules/${rule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: nextActive }),
        }
      );
      setRules((prev) =>
        prev.map((r) => (r.id === data.rule.id ? data.rule : r))
      );
      toast.success(
        nextActive ? `“${rule.name}” enabled` : `“${rule.name}” paused`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not update rule status.";
      toast.error("Update failed", { description: msg });
    }
  }

  async function confirmDeleteRule() {
    if (!deleteTarget) return;
    const rule = deleteTarget;
    try {
      await apiJson(`/v1/call-responder-rules/${rule.id}`, {
        method: "DELETE",
      });
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Rule removed", {
        description: `“${rule.name}” was removed from this list.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete rule.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-7">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-muted dark:text-foreground">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Call Responder
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Automatically reply to missed, rejected, received, or outgoing calls.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4"
              onClick={handleCallLogs}
            >
              <Clock className="size-4" />
              Call Logs
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary/90"
              disabled={!hasConnectedDevice || loading}
              onClick={() => {
                setEditingRule(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create Rule
            </Button>
          </div>
        </div>

        {!hasConnectedDevice && !loading ? (
          <DeviceConnectionAlert
            title="No WhatsApp Device Connected"
            description="Call responder requires an active, connected WhatsApp device to detect calls and send automatic WhatsApp replies. Please connect a device under Devices to get started."
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
              placeholder="Search rules..."
              className="h-10 rounded-md pl-10"
              aria-label="Search rules"
            />
          </div>
          <Select
            value={filter}
            onValueChange={(v) => setFilter((v ?? "all") as RuleFilter)}
            items={[
              { value: "all", label: "All Rules" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          >
            <SelectTrigger className="h-10 w-full rounded-md sm:w-[200px]">
              <SelectValue placeholder="All Rules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rules</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Rules"
            value={stats.total}
            icon={Phone}
            accent="blue"
          />
          <StatCard
            label="Active Rules"
            value={stats.active}
            icon={Play}
            accent="green"
          />
          <StatCard
            label="Responses Sent"
            value={stats.responsesSent}
            icon={MessageSquare}
            accent="violet"
          />
          <StatCard
            label="Calls Today"
            value={stats.callsToday}
            icon={PhoneMissed}
            accent="red"
          />
        </div>

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <CardContent className="p-0">
            {rules.length === 0 ? (
              <div className="px-6 pb-10 pt-6 sm:px-8">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-foreground" />
                    <p className="text-sm">Loading call responder...</p>
                  </div>
                ) : (
                  <>
                    <ListEmptyState
                      icon={Phone}
                      title="No call responder rules yet"
                      description={
                        devices.length === 0
                          ? "Connect a WhatsApp device before creating call responder rules."
                          : "Create your first call responder rule to start automating call responses."
                      }
                      className="py-14 sm:py-20"
                    />
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        className="h-10 rounded-md bg-primary px-5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                        disabled={devices.length === 0}
                        onClick={() => {
                          setEditingRule(null);
                          setCreateOpen(true);
                        }}
                      >
                        <Plus className="size-4" />
                        Create Rule
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                No rules match your search or filter.
              </div>
            ) : (
              <CallResponderRulesTable
                rules={pagedRules}
                onEdit={(r) => {
                  setEditingRule(r);
                  setCreateOpen(true);
                }}
                onToggleActive={handleToggleRuleActive}
                onDelete={(r) => setDeleteTarget(r)}
              />
            )}
            {visible.length > 0 ? <TablePagination {...pagination} /> : null}
          </CardContent>
        </Card>
      </div>

      <CreateCallResponderRuleDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingRule(null);
        }}
        devices={devices}
        templates={templates}
        initialRule={editingRule}
        onSave={handleSaveRule}
      />

      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Remove call responder rule?"
        description={
          <>
            Remove{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            from your list?
          </>
        }
        confirmLabel="Remove"
        onConfirm={confirmDeleteRule}
      />
    </>
  );
}
