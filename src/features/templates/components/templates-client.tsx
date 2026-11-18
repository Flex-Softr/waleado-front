"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  CopyPlus,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { CreateTemplateDialog } from "@/features/templates/components/create-template-dialog";
import { DeleteTemplateDialog } from "@/features/templates/components/delete-template-dialog";
import { TemplateExamplesDialog } from "@/features/templates/components/template-examples-dialog";
import { WhatsAppMessagePreview } from "@/features/templates/components/whatsapp-message-preview";
import { messageTemplateApiToRecord } from "@/features/templates/lib/map-template-api";
import { folderLabel, renderTemplateText } from "@/features/templates/lib/render-template-text";
import { TEMPLATE_TYPE_OPTIONS } from "@/features/templates/config/template-type-definitions";
import type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";
import type { MessageTemplateRecord } from "@/types/template";
import type {
  CreateTemplateResponse,
  TemplatesListResponse,
  UpdateTemplateResponse,
} from "@/types/templates-api";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiFetch, apiJson } from "@/lib/api";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SortKey = "updated" | "used" | "name";

function typeOption(id: TemplateTypeId) {
  return TEMPLATE_TYPE_OPTIONS.find((t) => t.id === id);
}

function usageTotal(t: MessageTemplateRecord): number {
  const u = t.usage;
  return u ? u.autoReplies + u.campaigns + u.followUps + u.callResponders : 0;
}

function usageLines(t: MessageTemplateRecord): { where: string; count: number }[] {
  const u = t.usage;
  if (!u) return [];
  return [
    { where: "Follow-ups waiting", count: u.followUps },
    { where: "Auto-reply rules", count: u.autoReplies },
    { where: "Campaigns", count: u.campaigns },
    { where: "Call responder rules", count: u.callResponders },
  ].filter((x) => x.count > 0);
}

const selectClass =
  "h-11 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function TemplatesClient() {
  const { userId, workspaceId, routeKey } = useSessionIdentity();
  const [templates, setTemplates] = React.useState<MessageTemplateRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [examplesOpen, setExamplesOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<MessageTemplateRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MessageTemplateRecord | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | TemplateTypeId>("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [folder, setFolder] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("updated");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TemplatesListResponse>("/v1/templates");
      setTemplates(data.templates.map(messageTemplateApiToRecord));
    } catch (err) {
      toast.error("Load failed", {
        description: err instanceof ApiError ? err.message : "Could not load templates.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates, userId, workspaceId, routeKey]);

  // Close the row menu on any outside click.
  React.useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  const folders = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => folderLabel(a[0]).localeCompare(folderLabel(b[0])));
  }, [templates]);

  const allTags = React.useMemo(
    () => [...new Set(templates.flatMap((t) => t.tags))].sort(),
    [templates]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = templates.filter((t) => {
      const matchQ =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.versions.some((v) => v.toLowerCase().includes(q)) ||
        t.tags.some((g) => g.includes(q));
      return (
        matchQ &&
        (typeFilter === "all" || t.typeId === typeFilter) &&
        (tagFilter === "all" || t.tags.includes(tagFilter)) &&
        (folder === "all" || t.category === folder)
      );
    });
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "used"
          ? usageTotal(b) - usageTotal(a)
          : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [templates, search, typeFilter, tagFilter, folder, sort]);

  const selected =
    filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  function upsert(t: MessageTemplateRecord) {
    setTemplates((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      // Keep usage counts the list already knows (single-item responses don't carry them).
      return exists
        ? prev.map((x) => (x.id === t.id ? { ...t, usage: t.usage ?? x.usage } : x))
        : [t, ...prev];
    });
    setSelectedId(t.id);
  }

  async function toggleActive(t: MessageTemplateRecord) {
    setBusyId(t.id);
    try {
      const data = await apiJson<UpdateTemplateResponse>(`/v1/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      });
      upsert(messageTemplateApiToRecord(data.template));
      toast.success(t.active ? "Template turned off" : "Template turned on", {
        description: t.active
          ? "Hidden from pickers until you turn it on again."
          : "It appears in pickers again.",
      });
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof ApiError ? err.message : "Could not update template.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(t: MessageTemplateRecord) {
    setBusyId(t.id);
    try {
      const data = await apiJson<CreateTemplateResponse>(`/v1/templates/${t.id}/duplicate`, {
        method: "POST",
      });
      upsert(messageTemplateApiToRecord(data.template));
      toast.success("Template duplicated");
    } catch (err) {
      toast.error("Could not duplicate", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function copyText(t: MessageTemplateRecord) {
    try {
      await navigator.clipboard.writeText(t.content);
      toast.success("Message text copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function confirmDelete() {
    const t = deleteTarget;
    if (!t) return;
    const res = await apiFetch(`/v1/templates/${t.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      toast.error("Could not delete template", {
        description: "It may be in use by a rule or campaign. Turn it off instead.",
      });
      throw new ApiError(res.status, "Could not delete template");
    }
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    setDeleteTarget(null);
    toast.success("Template deleted");
  }

  function openEditor(t: MessageTemplateRecord | null) {
    setEditingTemplate(t);
    setFormOpen(true);
  }

  const chip = (on: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition",
      on
        ? "border-primary bg-primary/10 font-semibold text-foreground"
        : "bg-background text-muted-foreground hover:bg-muted"
    );

  const sampleCtx = { name: "Rahim", phone: "+8801712345678" };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Save messages once and reuse them in follow-ups, auto-replies, campaigns and live chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setExamplesOpen(true)}>
            <Sparkles className="size-4" />
            Start from examples
          </Button>
          <Button type="button" className="h-11 gap-2" onClick={() => openEditor(null)}>
            <Plus className="size-4" />
            New template
          </Button>
        </div>
      </div>

      {templates.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-11 min-w-0 flex-[999_1_260px] items-center gap-2 rounded-lg border bg-background px-3">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Search templates</span>
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, text or tag"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Type
              <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | TemplateTypeId)}>
                <option value="all">All types</option>
                {TEMPLATE_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {allTags.length > 0 ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Tag
                <select className={selectClass} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                  <option value="all">All tags</option>
                  {allTags.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="updated">Recently updated</option>
                <option value="used">Most used</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Folders">
            <button type="button" role="tab" aria-selected={folder === "all"} className={chip(folder === "all")} onClick={() => setFolder("all")}>
              All <span className="opacity-70">{templates.length}</span>
            </button>
            {folders.map(([f, n]) => (
              <button key={f} type="button" role="tab" aria-selected={folder === f} className={chip(folder === f)} onClick={() => setFolder(f)}>
                {folderLabel(f)} <span className="opacity-70">{n}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Loading templates…</p>
        </div>
      ) : templates.length === 0 ? (
        <ListEmptyState
          icon={FileText}
          title="No templates yet"
          description="Create your first template, or start from a few ready-made examples."
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">No matches</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setTagFilter("all");
              setFolder("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_64px_44px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground md:grid">
              <span>Template</span>
              <span>Folder</span>
              <span>Used in</span>
              <span>On</span>
              <span />
            </div>
            <ul>
              {filtered.map((t) => {
                const on = selected?.id === t.id;
                const opt = typeOption(t.typeId);
                const Icon = opt?.icon ?? FileText;
                const total = usageTotal(t);
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_64px_44px] items-center gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_130px_100px_64px_44px]",
                      on ? "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]" : "bg-card"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className="flex min-w-0 items-center gap-3 text-left"
                      aria-current={on}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-semibold">{t.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {opt?.label ?? t.typeId}
                          {t.versions.length > 0 ? ` · ${t.versions.length + 1} versions` : ""} · {t.content || "—"}
                        </span>
                        {t.tags.length > 0 ? (
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {t.tags.map((g) => (
                              <span key={g} className="rounded-full bg-indigo-50 px-2 py-px text-[11px] text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                                {g}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <span className="hidden truncate text-xs md:block">
                      <span className="rounded-full bg-muted px-2.5 py-1">{folderLabel(t.category)}</span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground md:block">
                      {total > 0 ? `${total} ${total === 1 ? "place" : "places"}` : "—"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.active}
                      aria-label={`${t.name} is ${t.active ? "on" : "off"}`}
                      disabled={busyId === t.id}
                      onClick={() => void toggleActive(t)}
                      className={cn(
                        "inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition",
                        t.active ? "justify-end bg-primary" : "justify-start bg-muted-foreground/40"
                      )}
                    >
                      <span className="size-5 rounded-full bg-white shadow" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`More actions for ${t.name}`}
                        aria-expanded={menuFor === t.id}
                        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor(menuFor === t.id ? null : t.id);
                        }}
                      >
                        <MoreHorizontal className="size-5" />
                      </button>
                      {menuFor === t.id ? (
                        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border bg-popover py-1 text-sm shadow-lg" role="menu">
                          <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted" onClick={() => openEditor(t)}>
                            <Pencil className="size-4" /> Edit
                          </button>
                          <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted" onClick={() => void duplicate(t)}>
                            <CopyPlus className="size-4" /> Duplicate
                          </button>
                          <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted" onClick={() => void copyText(t)}>
                            <Copy className="size-4" /> Copy text
                          </button>
                          <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-muted" onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="size-4" /> Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              Showing {filtered.length} of {templates.length} templates
            </p>
          </div>

          {selected ? (
            <aside className="min-w-0 flex-[1_1_340px] space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-4 lg:max-w-[420px]" aria-label="Template preview">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeOption(selected.typeId)?.label} · {folderLabel(selected.category)} · Updated {selected.updatedAtLabel}
                    {selected.active ? "" : " · Off"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => openEditor(selected)}>
                  Edit
                </Button>
              </div>
              <div className="flex justify-center rounded-xl bg-muted/50 py-4">
                <WhatsAppMessagePreview
                  compact
                  contactLabel="Rahim"
                  body={renderTemplateText(selected.content, selected.variables, sampleCtx)}
                  footer={selected.footer ? renderTemplateText(selected.footer, selected.variables, sampleCtx) : undefined}
                  buttons={selected.buttons}
                  typeId={selected.typeId}
                  media={selected.media}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Preview with sample name “Rahim”
                {selected.versions.length > 0 ? ` · version 1 of ${selected.versions.length + 1}` : ""}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Used in</p>
                {usageLines(selected).length > 0 ? (
                  usageLines(selected).map((u) => (
                    <div key={u.where} className="flex justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <span>{u.where}</span>
                      <span className="text-muted-foreground">{u.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Not used anywhere yet.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busyId === selected.id} onClick={() => void duplicate(selected)}>
                  <CopyPlus className="size-4" /> Duplicate
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyText(selected)}>
                  <Copy className="size-4" /> Copy text
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      )}

      <CreateTemplateDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
        folders={folders.map(([f]) => f)}
        onCreated={(t) => {
          upsert(t);
          toast.success("Template saved", { description: `“${t.name}” is ready to use.` });
        }}
        onUpdated={(t) => {
          upsert(t);
          toast.success("Template updated");
        }}
      />
      <TemplateExamplesDialog
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        onAdded={(list) => {
          list.forEach(upsert);
          void loadTemplates();
        }}
      />
      <DeleteTemplateDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        template={deleteTarget}
        onDelete={confirmDelete}
      />
    </div>
  );
}
