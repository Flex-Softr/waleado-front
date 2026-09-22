"use client";

import * as React from "react";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type {
  AiCredentialApi,
  AiCredentialMutationResponse,
  AiCredentialsListResponse,
  AiModelApi,
  AiModelsResponse,
  AiProviderId,
  AiProvidersResponse,
} from "@/types/ai-credentials-api";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiFetch, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function providerLabel(p: AiProviderId): string {
  return p === "gemini" ? "Google Gemini" : "OpenRouter";
}

export function AiCredentialsClient() {
  const { routeKey } = useSessionIdentity();
  const [credentials, setCredentials] = React.useState<AiCredentialApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AiCredentialApi | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AiCredentialApi | null>(
    null
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson<AiCredentialsListResponse>("/v1/ai-credentials");
      setCredentials(res.credentials);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load credentials.";
      toast.error("Load failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, routeKey]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`/v1/ai-credentials/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        let message = res.statusText;
        try {
          const body = (await res.json()) as { error?: { message?: string } };
          message = body.error?.message ?? message;
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, message);
      }
      toast.success("Credential deleted", {
        description: `“${deleteTarget.name}” was removed.`,
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete credential.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            AI Credentials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store Gemini and OpenRouter API keys for auto-reply and chatbot.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add credential
        </Button>
      </div>

      <Card className="overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
          <CardTitle className="text-lg">Saved keys</CardTitle>
          <CardDescription>
            Each purpose (auto-reply rule or chatbot flow) can pick a different
            credential and model.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : credentials.length === 0 ? (
            <div className="space-y-4 p-6">
              <ListEmptyState
                icon={KeyRound}
                title="No credentials yet"
                description="Add a Google Gemini or OpenRouter API key to power AI replies."
              />
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add credential
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {credentials.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-50">
                        {c.name}
                      </p>
                      <Badge variant="secondary">{providerLabel(c.provider)}</Badge>
                      {!c.active ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.apiKeyMasked}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Model: {c.modelLabel ?? c.model}
                      {c.apiEndpoint
                        ? ` · ${c.apiEndpoint}`
                        : ` · ${c.defaultApiEndpoint}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CredentialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={async () => {
          setDialogOpen(false);
          await load();
        }}
      />

      <ConfirmDestructiveDialog
        open={deleteTarget != null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete credential?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}”? Rules or flows using it must be updated first.`
            : "This credential will be permanently removed."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CredentialFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiCredentialApi | null;
  onSaved: () => Promise<void>;
}) {
  const isEdit = editing != null;
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState<AiProviderId>("gemini");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [apiEndpoint, setApiEndpoint] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [providers, setProviders] = React.useState<
    { id: AiProviderId; label: string; defaultApiEndpoint: string }[]
  >([]);
  const [models, setModels] = React.useState<AiModelApi[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const effectiveProvider = isEdit && editing ? editing.provider : provider;

  const defaultEndpoint = React.useMemo(() => {
    const fromList = providers.find((p) => p.id === effectiveProvider);
    if (fromList?.defaultApiEndpoint) return fromList.defaultApiEndpoint;
    if (editing?.defaultApiEndpoint) return editing.defaultApiEndpoint;
    return "";
  }, [providers, effectiveProvider, editing]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<AiProvidersResponse>("/v1/ai/providers");
        if (!cancelled) setProviders(res.providers);
      } catch {
        if (!cancelled) {
          setProviders([
            {
              id: "gemini",
              label: "Google Gemini",
              defaultApiEndpoint:
                "https://generativelanguage.googleapis.com/v1beta/openai",
            },
            {
              id: "openrouter",
              label: "OpenRouter",
              defaultApiEndpoint: "https://openrouter.ai/api/v1",
            },
          ]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      try {
        const res = await apiJson<AiModelsResponse>(
          `/v1/ai/models?provider=${encodeURIComponent(effectiveProvider)}`
        );
        if (!cancelled) setModels(res.models);
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveProvider]);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setProvider(editing.provider);
      setApiKey("");
      setModel(editing.model);
      setApiEndpoint(editing.apiEndpoint ?? "");
      setActive(editing.active);
    } else {
      setName("");
      setProvider("gemini");
      setApiKey("");
      setModel("");
      setApiEndpoint("");
      setActive(true);
    }
  }, [open, editing]);

  const freeModels = models.filter((m) => m.tier === "free");
  const paidModels = models.filter((m) => m.tier === "paid");

  const canSubmit =
    name.trim().length > 0 &&
    model.trim().length > 0 &&
    (isEdit || apiKey.trim().length > 0) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const endpointPayload =
        apiEndpoint.trim() === "" ? null : apiEndpoint.trim();

      if (isEdit && editing) {
        const body: {
          name: string;
          active: boolean;
          model: string;
          apiEndpoint: string | null;
          apiKey?: string;
        } = {
          name: name.trim(),
          active,
          model: model.trim(),
          apiEndpoint: endpointPayload,
        };
        if (apiKey.trim()) body.apiKey = apiKey.trim();
        await apiJson<AiCredentialMutationResponse>(
          `/v1/ai-credentials/${editing.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        toast.success("Credential updated");
      } else {
        await apiJson<AiCredentialMutationResponse>("/v1/ai-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            provider,
            apiKey: apiKey.trim(),
            model: model.trim(),
            apiEndpoint: endpointPayload,
          }),
        });
        toast.success("Credential added");
      }
      await onSaved();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not save credential.";
      toast.error("Save failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const providerOptions =
    providers.length > 0
      ? providers
      : [
          {
            id: "gemini" as const,
            label: "Google Gemini",
            defaultApiEndpoint:
              "https://generativelanguage.googleapis.com/v1beta/openai",
          },
          {
            id: "openrouter" as const,
            label: "OpenRouter",
            defaultApiEndpoint: "https://openrouter.ai/api/v1",
          },
        ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-[95vw] lg:max-w-[880px] xl:max-w-[940px] overflow-y-auto sm:rounded-2xl p-6 sm:p-7">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl font-semibold">
            {isEdit ? "Edit AI Credential" : "Add AI Credential"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEdit
              ? "Update name, model, endpoint, or rotate the API key."
              : "Save provider API key, default model, and optional custom endpoint."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ai-cred-name">
              Name <span className="text-red-600 dark:text-red-400">*</span>
            </Label>
            <Input
              id="ai-cred-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Gemini"
              className="h-11 rounded-xl"
            />
          </div>

          {!isEdit ? (
            <div className="space-y-2">
              <Label>
                Provider <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  const next = (v as AiProviderId) ?? "gemini";
                  setProvider(next);
                  setModel("");
                }}
                items={providerOptions.map((p) => ({
                  value: p.id,
                  label: p.label,
                }))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input
                value={providerLabel(editing.provider)}
                disabled
                className="h-11 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Model <span className="text-red-600 dark:text-red-400">*</span>
            </Label>
            <Select
              value={model}
              onValueChange={(v) => setModel(v ?? "")}
              disabled={modelsLoading}
              items={[
                ...freeModels.map((m) => ({ value: m.id, label: m.label })),
                ...paidModels.map((m) => ({ value: m.id, label: m.label })),
              ]}
            >
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue
                  placeholder={
                    modelsLoading ? "Loading models…" : "Select model"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {freeModels.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Free
                    </div>
                    {freeModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </>
                ) : null}
                {paidModels.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Paid
                    </div>
                    {paidModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </>
                ) : null}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-cred-key">
              API key{isEdit ? " (optional)" : " *"}{" "}
              {!isEdit && <span className="text-red-600 dark:text-red-400">*</span>}
            </Label>
            <Input
              id="ai-cred-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Paste API key"}
              className="h-11 rounded-xl font-mono text-sm"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ai-cred-endpoint">API endpoint (optional)</Label>
            <Input
              id="ai-cred-endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder={defaultEndpoint || "https://…"}
              className="h-11 rounded-xl text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave empty to use the provider default (
              {defaultEndpoint || "provider default"}).
            </p>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between border-t border-border/80 pt-4">
            {isEdit ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Active Credential
              </label>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : isEdit ? (
                  "Save Changes"
                ) : (
                  "Add Credential"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
