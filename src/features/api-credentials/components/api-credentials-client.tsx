"use client";

import * as React from "react";
import Link from "next/link";
import {
  Blocks,
  BookOpen,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
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
  createApiCredential,
  listApiCredentials,
  revokeApiCredential,
} from "@/features/api-credentials/lib/api-credentials-api";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError } from "@/lib/api";
import type {
  ApiCredentialApi,
  ApiCredentialCreatedApi,
} from "@/types/api-credentials-api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export function ApiCredentialsClient() {
  const { routeKey } = useSessionIdentity();
  const { workspace } = useAuth();
  const canManage =
    workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  const [credentials, setCredentials] = React.useState<ApiCredentialApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [created, setCreated] = React.useState<ApiCredentialCreatedApi | null>(
    null
  );
  const [revokeTarget, setRevokeTarget] =
    React.useState<ApiCredentialApi | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listApiCredentials();
      setCredentials(res.credentials);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load API credentials.";
      toast.error("Load failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, routeKey]);

  async function confirmRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeApiCredential(revokeTarget.id);
      toast.success("Credential revoked", {
        description: `“${revokeTarget.name}” can no longer call the Open API.`,
      });
      setRevokeTarget(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not revoke credential.";
      toast.error("Revoke failed", { description: msg });
      throw err;
    }
  }

  const activeCredentials = credentials.filter((c) => c.active && !c.revokedAt);
  const revokedCredentials = credentials.filter(
    (c) => !c.active || c.revokedAt
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            API Credentials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create client ID and secret keys for external apps using the Open
            API.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={<Link href="/integrations" />}
          >
            <Blocks className="size-4" />
            Integrations
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={<Link href="/api-docs" />}
          >
            <BookOpen className="size-4" />
            API docs
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={!canManage}
            title={
              canManage
                ? undefined
                : "Only workspace owners and admins can create credentials"
            }
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create credential
          </Button>
        </div>
      </div>

      {!canManage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          You can view credentials, but only owners and admins can create or
          revoke them.
        </p>
      ) : null}

      <Card className="overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
          <CardTitle className="text-lg">Active keys</CardTitle>
          <CardDescription>
            Send{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              X-Client-Id
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              X-Client-Secret
            </code>{" "}
            on every Open API request.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : activeCredentials.length === 0 ? (
            <div className="space-y-4 p-6">
              <ListEmptyState
                icon={KeyRound}
                title="No API credentials yet"
                description="Create a client ID and secret so your app can send messages via the Open API."
              />
              {canManage ? (
                <div className="flex justify-center">
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Create credential
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeCredentials.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-50">
                        {c.name}
                      </p>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {c.clientId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Secret: {c.clientSecretPrefix}… · Last used:{" "}
                      {formatDate(c.lastUsedAt)} · Created:{" "}
                      {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void copyText("Client ID", c.clientId)}
                    >
                      <Copy className="size-3.5" />
                      Copy ID
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-red-600 hover:text-red-700"
                        onClick={() => setRevokeTarget(c)}
                      >
                        <Trash2 className="size-3.5" />
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {revokedCredentials.length > 0 ? (
        <Card className="overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
            <CardTitle className="text-lg">Revoked</CardTitle>
            <CardDescription>
              These keys no longer work. Secrets cannot be recovered.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {revokedCredentials.map((c) => (
                <li key={c.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      {c.name}
                    </p>
                    <Badge variant="outline">Revoked</Badge>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {c.clientId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revoked: {formatDate(c.revokedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <CreateCredentialDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(cred) => {
          setCreateOpen(false);
          setCreated(cred);
          void load();
        }}
      />

      <SecretRevealDialog
        credential={created}
        onOpenChange={(open) => {
          if (!open) setCreated(null);
        }}
      />

      <ConfirmDestructiveDialog
        open={revokeTarget != null}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
        title="Revoke API credential?"
        description={
          revokeTarget
            ? `Revoke “${revokeTarget.name}”? Any integration using this client ID and secret will stop working immediately.`
            : "This credential will be revoked."
        }
        confirmLabel="Revoke"
        onConfirm={confirmRevoke}
      />
    </div>
  );
}

function CreateCredentialDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (credential: ApiCredentialCreatedApi) => void;
}) {
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) setName("");
  }, [open]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await createApiCredential(trimmed);
      toast.success("Credential created", {
        description: "Copy the client secret now — it won’t be shown again.",
      });
      onCreated(res.credential);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create credential.";
      toast.error("Create failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create API credential</DialogTitle>
          <DialogDescription>
            Give this key a name so you know which integration uses it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="api-cred-name">Name</Label>
            <Input
              id="api-cred-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production CRM"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              disabled={!name.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SecretRevealDialog({
  credential,
  onOpenChange,
}: {
  credential: ApiCredentialCreatedApi | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedSecret, setCopiedSecret] = React.useState(false);

  React.useEffect(() => {
    if (credential) setCopiedSecret(false);
  }, [credential]);

  return (
    <Dialog open={credential != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save your client secret</DialogTitle>
          <DialogDescription>
            This is the only time the full secret is shown. Store it securely.
          </DialogDescription>
        </DialogHeader>
        {credential ? (
          <div className="space-y-4 pt-2">
            <SecretField
              label="Client ID"
              value={credential.clientId}
              onCopy={() => void copyText("Client ID", credential.clientId)}
            />
            <SecretField
              label="Client secret"
              value={credential.clientSecret}
              onCopy={async () => {
                await copyText("Client secret", credential.clientSecret);
                setCopiedSecret(true);
              }}
              emphasize
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => onOpenChange(false)}>
                {copiedSecret ? (
                  <>
                    <Check className="size-4" />
                    Done
                  </>
                ) : (
                  "I’ve saved the secret"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SecretField({
  label,
  value,
  onCopy,
  emphasize,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={value}
          className={`rounded-xl font-mono text-xs ${
            emphasize ? "border-amber-300 dark:border-amber-700" : ""
          }`}
        />
        <Button type="button" variant="outline" size="icon" onClick={onCopy}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}
