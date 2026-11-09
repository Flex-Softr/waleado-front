"use client";

import * as React from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  fetchSystemMessaging,
  fetchSystemTemplates,
  type SystemMessagingConfig,
  type SystemTemplate,
} from "@/features/admin/lib/admin-system-api";
import { MessagingSettingsCard } from "@/features/admin/messaging/messaging-settings-card";
import { TemplateEditor } from "@/features/admin/messaging/template-editor";
import { TestMessageCard } from "@/features/admin/messaging/test-message-card";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AdminMessagingClient() {
  const [config, setConfig] = React.useState<SystemMessagingConfig | null>(null);
  const [templates, setTemplates] = React.useState<SystemTemplate[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([fetchSystemMessaging(), fetchSystemTemplates()])
      .then(([cfg, t]) => {
        setConfig(cfg);
        setTemplates(t.templates);
      })
      .catch((e) => toast.error("Could not load messaging", { description: e instanceof ApiError ? e.message : undefined }));
  }, []);

  if (!config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selected = templates.find((t) => t.key === selectedKey) ?? templates[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        icon={MessageSquareText}
        title="System messaging"
        description="How Waleado talks to customers: OTP, renewal reminders, receipts and alerts."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MessagingSettingsCard config={config} onSaved={setConfig} />
        </div>
        <TestMessageCard />
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle>Message templates</CardTitle>
          <CardDescription>Change the wording or turn a channel off per message.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-1">
            {templates.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedKey(t.key)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                  selected?.key === t.key && "bg-muted font-medium"
                )}
              >
                {t.label}
                {t.customized ? <span className="ml-1 text-xs text-emerald-600">• edited</span> : null}
              </button>
            ))}
          </nav>
          {selected ? (
            <TemplateEditor
              key={selected.key}
              template={selected}
              onChange={(next) => setTemplates((list) => list.map((t) => (t.key === next.key ? next : t)))}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
