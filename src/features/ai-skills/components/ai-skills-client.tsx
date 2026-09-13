"use client";

import * as React from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AiSkillApi,
  AiSkillsListResponse,
  CreateAiSkillPayload,
  UpdateAiSkillPayload,
} from "@/types/ai-skills-api";
import type {
  AiCredentialApi,
  AiCredentialsListResponse,
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
import { Textarea } from "@/components/ui/textarea";

export function AiSkillsClient() {
  const { routeKey } = useSessionIdentity();
  const [skills, setSkills] = React.useState<AiSkillApi[]>([]);
  const [credentials, setCredentials] = React.useState<AiCredentialApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AiSkillApi | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AiSkillApi | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [skillsRes, credsRes] = await Promise.all([
        apiJson<AiSkillsListResponse>("/v1/ai-skills"),
        apiJson<AiCredentialsListResponse>("/v1/ai-credentials").catch(() => ({
          credentials: [],
        })),
      ]);
      setSkills(skillsRes.skills);
      setCredentials(credsRes.credentials);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load AI skills.";
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
      const res = await apiFetch(`/v1/ai-skills/${deleteTarget.id}`, {
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
      toast.success("AI Skill deleted", {
        description: `“${deleteTarget.name}” was removed.`,
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete AI skill.";
      toast.error("Delete failed", { description: msg });
      throw err;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            AI Skills & Continuous Chat
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teach your AI assistant about its role, services, and business
            knowledge. Tenants can select this skill in Auto-Reply rules for
            smart continuous conversation.
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
          Create Skill
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <div className="space-y-4">
          <ListEmptyState
            icon={Sparkles}
            title="No AI skills yet"
            description="Create your first skill to teach the AI your business services, FAQs, and role so it can reply in continuous chat."
          />
          <div className="flex justify-center">
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create Skill
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {skills.map((s) => (
            <Card
              key={s.id}
              className="flex flex-col justify-between border-slate-200/80 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="size-4 text-emerald-500" />
                      {s.name}
                    </CardTitle>
                    {s.description ? (
                      <CardDescription className="mt-1">
                        {s.description}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.continuousChat ? (
                      <Badge
                        variant="secondary"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <MessagesSquare className="mr-1 size-3" />
                        Continuous Chat
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Single Turn
                      </Badge>
                    )}
                    {s.active ? (
                      <Badge
                        variant="secondary"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4 text-sm">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    AI Role & Persona
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-700 dark:text-slate-300">
                    {s.rolePrompt}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-white p-2.5 dark:border-slate-800/80 dark:bg-slate-950/50">
                    <span className="text-[11px] font-medium text-slate-400">
                      Services Provided
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {s.servicesDescription}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-2.5 dark:border-slate-800/80 dark:bg-slate-950/50">
                    <span className="text-[11px] font-medium text-slate-400">
                      Business Knowledge
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {s.businessKnowledge}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {s.aiCredentialName ? (
                    <span>
                      Key:{" "}
                      <strong className="font-medium text-slate-700 dark:text-slate-200">
                        {s.aiCredentialName}
                      </strong>
                    </span>
                  ) : (
                    <span>Key: Default Workspace</span>
                  )}
                  {s.model ? (
                    <span>
                      Model:{" "}
                      <strong className="font-medium text-slate-700 dark:text-slate-200">
                        {s.model}
                      </strong>
                    </span>
                  ) : null}
                  <span>Temp: {s.temperature}</span>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setEditing(s);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AiSkillFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        editingSkill={editing}
        credentials={credentials}
        onSuccess={async () => {
          setDialogOpen(false);
          setEditing(null);
          await load();
        }}
      />

      <ConfirmDestructiveDialog
        open={deleteTarget != null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Delete AI Skill"
        description={
          deleteTarget
            ? `Delete skill “${deleteTarget.name}”? Any auto-reply rules using this skill will revert to standard mode.`
            : ""
        }
        confirmLabel="Delete Skill"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

type AiSkillFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSkill: AiSkillApi | null;
  credentials: AiCredentialApi[];
  onSuccess: () => void;
};

const CREDENTIAL_NONE = "__none__";

function AiSkillFormDialog({
  open,
  onOpenChange,
  editingSkill,
  credentials,
  onSuccess,
}: AiSkillFormDialogProps) {
  const isEdit = editingSkill != null;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rolePrompt, setRolePrompt] = React.useState("");
  const [servicesDescription, setServicesDescription] = React.useState("");
  const [businessKnowledge, setBusinessKnowledge] = React.useState("");
  const [customInstructions, setCustomInstructions] = React.useState("");
  const [aiCredentialId, setAiCredentialId] = React.useState("");
  const [model, setModel] = React.useState("");
  const [temperature, setTemperature] = React.useState("0.7");
  const [maxTokens, setMaxTokens] = React.useState("1024");
  const [continuousChat, setContinuousChat] = React.useState(true);
  const [active, setActive] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editingSkill) {
      setName(editingSkill.name);
      setDescription(editingSkill.description ?? "");
      setRolePrompt(editingSkill.rolePrompt);
      setServicesDescription(editingSkill.servicesDescription);
      setBusinessKnowledge(editingSkill.businessKnowledge);
      setCustomInstructions(editingSkill.customInstructions ?? "");
      setAiCredentialId(editingSkill.aiCredentialId ?? "");
      setModel(editingSkill.model ?? "");
      setTemperature(String(editingSkill.temperature ?? 0.7));
      setMaxTokens(editingSkill.maxTokens ? String(editingSkill.maxTokens) : "1024");
      setContinuousChat(editingSkill.continuousChat !== false);
      setActive(editingSkill.active !== false);
    } else {
      setName("");
      setDescription("");
      setRolePrompt(
        "You are an empathetic, friendly, and professional AI customer support specialist."
      );
      setServicesDescription(
        "We offer business solutions, software consulting, and automated customer communication services."
      );
      setBusinessKnowledge(
        "Business Hours: Monday to Friday, 9:00 AM - 6:00 PM.\nPricing: Plans start from $29/mo.\nWebsite: https://example.com\nSupport email: support@example.com"
      );
      setCustomInstructions(
        "Be concise and respectful. If you cannot answer a question based on the business details, politely offer to connect the customer with human support."
      );
      setAiCredentialId("");
      setModel("");
      setTemperature("0.7");
      setMaxTokens("1024");
      setContinuousChat(true);
      setActive(true);
    }
  }, [editingSkill, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation error", { description: "Skill name is required." });
      return;
    }
    if (!rolePrompt.trim()) {
      toast.error("Validation error", {
        description: "AI role description is required.",
      });
      return;
    }
    if (!servicesDescription.trim()) {
      toast.error("Validation error", {
        description: "Services description is required.",
      });
      return;
    }
    if (!businessKnowledge.trim()) {
      toast.error("Validation error", {
        description: "Business knowledge is required.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateAiSkillPayload = {
        name: name.trim(),
        description: description.trim() || null,
        rolePrompt: rolePrompt.trim(),
        servicesDescription: servicesDescription.trim(),
        businessKnowledge: businessKnowledge.trim(),
        customInstructions: customInstructions.trim() || null,
        aiCredentialId:
          aiCredentialId && aiCredentialId !== CREDENTIAL_NONE
            ? aiCredentialId
            : null,
        model: model.trim() || null,
        temperature: Number.parseFloat(temperature) || 0.7,
        maxTokens: Number.parseInt(maxTokens, 10) || 1024,
        continuousChat,
        active,
      };

      if (isEdit) {
        await apiJson<{ skill: AiSkillApi }>(`/v1/ai-skills/${editingSkill.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("AI Skill updated", {
          description: `“${payload.name}” has been updated.`,
        });
      } else {
        await apiJson<{ skill: AiSkillApi }>("/v1/ai-skills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("AI Skill created", {
          description: `“${payload.name}” has been created.`,
        });
      }
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to save AI skill.";
      toast.error("Save failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const activeCredentials = React.useMemo(
    () => credentials.filter((c) => c.active),
    [credentials]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-emerald-500" />
            {isEdit ? "Edit AI Skill" : "Teach New AI Skill"}
          </DialogTitle>
          <DialogDescription>
            Provide your business knowledge, services, and AI role. This
            teaches the AI how to represent your business in WhatsApp chats.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="skill-name" className="text-xs font-semibold">
                Skill Name *
              </Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Support & Booking Specialist"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="skill-desc" className="text-xs font-semibold">
                Short Description (Optional)
              </Label>
              <Input
                id="skill-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Handles general inquiries and explains available service packages"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-role" className="text-xs font-semibold">
              1. AI Role & Persona *
            </Label>
            <p className="text-xs text-muted-foreground">
              Define who the AI is, what tone to adopt, and its primary purpose.
            </p>
            <Textarea
              id="skill-role"
              value={rolePrompt}
              onChange={(e) => setRolePrompt(e.target.value)}
              rows={3}
              placeholder="e.g. You are Alex, the friendly customer support specialist for Acme Digital..."
              className="rounded-xl text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-services" className="text-xs font-semibold">
              2. Services & Products Provided *
            </Label>
            <p className="text-xs text-muted-foreground">
              Describe what services, packages, or goods your business sells or
              delivers.
            </p>
            <Textarea
              id="skill-services"
              value={servicesDescription}
              onChange={(e) => setServicesDescription(e.target.value)}
              rows={3}
              placeholder="e.g. We provide 1) Web Development, 2) Mobile Apps, 3) WhatsApp Marketing..."
              className="rounded-xl text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-knowledge" className="text-xs font-semibold">
              3. Business Knowledge & FAQs *
            </Label>
            <p className="text-xs text-muted-foreground">
              Crucial business facts: hours, pricing, office address, return
              policies, booking links, and frequently asked questions.
            </p>
            <Textarea
              id="skill-knowledge"
              value={businessKnowledge}
              onChange={(e) => setBusinessKnowledge(e.target.value)}
              rows={4}
              placeholder="e.g. Hours: Mon-Fri 9am-6pm. Office: 123 Tech Park. Pricing: Standard $50, Pro $150..."
              className="rounded-xl text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-instructions" className="text-xs font-semibold">
              4. Additional Guidelines & Rules (Optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Guardrails, dos & don'ts, or special tone rules.
            </p>
            <Textarea
              id="skill-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Never promise discounts over 10%. Always ask for the customer's preferred date..."
              className="rounded-xl text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              AI Settings & Continuous Chat
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">AI Credential</Label>
                <Select
                  value={aiCredentialId || CREDENTIAL_NONE}
                  onValueChange={(val) =>
                    setAiCredentialId(!val || val === CREDENTIAL_NONE ? "" : val)
                  }
                >
                  <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Workspace default credential" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CREDENTIAL_NONE}>
                      Workspace default credential
                    </SelectItem>
                    {activeCredentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.provider === "gemini" ? "Gemini" : "OpenRouter"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Model Override (Optional)
                </Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemini-flash-latest"
                  className="rounded-xl bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Temperature (0–2)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="rounded-xl bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Tokens</Label>
                <Input
                  type="number"
                  step="1"
                  min="50"
                  max="4096"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  className="rounded-xl bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200/60 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Continuous Multi-Turn Chat
                </p>
                <p className="text-[11px] text-muted-foreground">
                  The AI remembers previous messages exchanged with each
                  customer and maintains context across replies.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={continuousChat}
                  onChange={(e) => setContinuousChat(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={
                    continuousChat
                      ? "relative h-6 w-11 shrink-0 rounded-full border border-emerald-500 bg-emerald-500 transition-colors"
                      : "relative h-6 w-11 shrink-0 rounded-full border border-slate-200 bg-slate-200 transition-colors dark:border-slate-600 dark:bg-slate-700"
                  }
                >
                  <span
                    className={
                      continuousChat
                        ? "absolute left-0.5 top-0.5 size-5 translate-x-5 rounded-full bg-white shadow transition-transform"
                        : "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform"
                    }
                  />
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Active Skill
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {isEdit ? "Update Skill" : "Save Skill"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
