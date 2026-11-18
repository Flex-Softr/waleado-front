"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { messageTemplateApiToRecord } from "@/features/templates/lib/map-template-api";
import type { MessageTemplateRecord } from "@/types/template";
import type { MessageTemplateApiRecord } from "@/types/templates-api";
import { ApiError, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Example = { key: string; name: string; category: string; body: string; versions: number };

export function TemplateExamplesDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (templates: MessageTemplateRecord[]) => void;
}) {
  const [examples, setExamples] = React.useState<Example[] | null>(null);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || examples) return;
    let cancelled = false;
    apiJson<{ examples: Example[] }>("/v1/templates/examples")
      .then((r) => {
        if (cancelled) return;
        setExamples(r.examples);
        setPicked(r.examples.map((e) => e.key));
      })
      .catch(() => {
        if (!cancelled) setExamples([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, examples]);

  async function add() {
    setSaving(true);
    try {
      const res = await apiJson<{ templates: MessageTemplateApiRecord[] }>("/v1/templates/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: picked }),
      });
      onAdded(res.templates.map(messageTemplateApiToRecord));
      toast.success(`${res.templates.length} template${res.templates.length === 1 ? "" : "s"} added`, {
        description: "Edit them to match your business.",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not add examples", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from examples</DialogTitle>
          <DialogDescription>
            Pick ready-made messages to add to your library. You can edit them afterwards.
          </DialogDescription>
        </DialogHeader>
        {examples === null ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-2">
            {examples.map((e) => (
              <label key={e.key} className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  checked={picked.includes(e.key)}
                  onChange={(ev) =>
                    setPicked((prev) => (ev.target.checked ? [...prev, e.key] : prev.filter((k) => k !== e.key)))
                  }
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-semibold">
                    {e.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {e.category}
                      {e.versions > 1 ? ` · ${e.versions} versions` : ""}
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground">{e.body}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || picked.length === 0} onClick={() => void add()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Add {picked.length || ""} template{picked.length === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
