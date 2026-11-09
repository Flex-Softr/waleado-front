"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

/** A titled inline form with one submit button; reports errors with a toast. */
export function ActionForm({
  title,
  hint,
  submitLabel,
  canSubmit,
  onSubmit,
  children,
}: {
  title: string;
  hint?: string;
  submitLabel: string;
  canSubmit: boolean;
  /** Return a success message to show. */
  onSubmit: () => Promise<string>;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      toast.success(await onSubmit());
    } catch (err) {
      toast.error(`${title} failed`, { description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
