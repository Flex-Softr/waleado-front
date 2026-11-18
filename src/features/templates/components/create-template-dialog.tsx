"use client";

import * as React from "react";
import { toast } from "sonner";

import { TEMPLATE_TYPE_OPTIONS } from "@/features/templates/config/template-type-definitions";
import type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";
import { getTemplateTypeHint } from "@/features/templates/config/template-type-definitions";
import { buildLivePreviewMedia } from "@/features/templates/lib/build-live-preview-media";
import {
  buildTemplateMediaPayload,
  templateTypeNeedsFileUpload,
} from "@/features/templates/lib/build-template-media-payload";
import { extrasFromTemplateMedia } from "@/features/templates/lib/extras-from-template-media";
import { messageTemplateApiToRecord } from "@/features/templates/lib/map-template-api";
import { validateTemplateCreateClient } from "@/features/templates/lib/validate-template-create-client";
import { TemplateInteractiveButtonsField } from "@/features/templates/components/template-interactive-buttons-field";
import { TemplateTypeExtrasFields } from "@/features/templates/components/template-type-extras-fields";
import { TemplateTextEditor } from "@/features/templates/components/template-text-editor";
import {
  normalizeVariableKey,
  renderTemplateText,
  SHOW_IN_OPTIONS,
  undefinedVariableKeys,
} from "@/features/templates/lib/render-template-text";
import { WhatsAppMessagePreview } from "@/features/templates/components/whatsapp-message-preview";
import {
  createEmptyTemplateFormExtras,
  type TemplateFormExtras,
} from "@/features/templates/types/template-form-extras";
import type {
  MessageTemplateRecord,
  TemplateInteractiveButton,
} from "@/types/template";
import type {
  CreateTemplateResponse,
  TemplateShowIn,
  TemplateVariableApi,
  UpdateTemplateResponse,
} from "@/types/templates-api";
import { ApiError, apiFormJson, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

type CreateTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: MessageTemplateRecord) => void;
  /** Edit mode: pre-fills the form and PATCHes on save. */
  editingTemplate?: MessageTemplateRecord | null;
  onUpdated?: (template: MessageTemplateRecord) => void;
  /** Existing folder names, offered as suggestions. */
  folders?: string[];
};

const ALL_SHOW_IN: TemplateShowIn[] = ["follow_up", "auto_reply", "campaign", "live_chat"];

const defaultType: TemplateTypeId = "text_message";

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
  editingTemplate = null,
  onUpdated,
  folders = [],
}: CreateTemplateDialogProps) {
  const isEdit = Boolean(editingTemplate);
  const [typeId, setTypeId] = React.useState<TemplateTypeId>(defaultType);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("general");
  const [content, setContent] = React.useState("");
  /** Alternate versions of the message (version 1 is `content`). */
  const [versions, setVersions] = React.useState<string[]>([]);
  const [activeVersion, setActiveVersion] = React.useState(0);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagDraft, setTagDraft] = React.useState("");
  const [variables, setVariables] = React.useState<TemplateVariableApi[]>([]);
  const [showIn, setShowIn] = React.useState<TemplateShowIn[]>(ALL_SHOW_IN);
  const [sample, setSample] = React.useState(true);
  const [footer, setFooter] = React.useState("");
  const [buttons, setButtons] = React.useState<TemplateInteractiveButton[]>(
    []
  );
  const [extras, setExtras] = React.useState<TemplateFormExtras>(() =>
    createEmptyTemplateFormExtras()
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingTemplate) {
      setTypeId(editingTemplate.typeId);
      setName(editingTemplate.name);
      setCategory(editingTemplate.category ?? "general");
      setContent(editingTemplate.content);
      setVersions(editingTemplate.versions ?? []);
      setActiveVersion(0);
      setTags(editingTemplate.tags ?? []);
      setTagDraft("");
      setVariables(editingTemplate.variables ?? []);
      setShowIn(editingTemplate.showIn ?? ALL_SHOW_IN);
      setFooter(editingTemplate.footer ?? "");
      if (editingTemplate.typeId === "mixed_interactive") {
        setButtons(editingTemplate.buttons ?? []);
      } else {
        setButtons([]);
      }
      const baseExtras = extrasFromTemplateMedia(
        editingTemplate.typeId,
        editingTemplate.media ?? undefined
      );
      if (editingTemplate.typeId === "message_buttons") {
        setExtras({
          ...baseExtras,
          messageButtons: editingTemplate.buttons ?? [],
        });
      } else {
        setExtras(baseExtras);
      }
      setSubmitting(false);
      return;
    }
    setTypeId(defaultType);
    setName("");
    setCategory("general");
    setContent("");
    setVersions([]);
    setActiveVersion(0);
    setTags([]);
    setTagDraft("");
    setVariables([]);
    setShowIn(ALL_SHOW_IN);
    setFooter("");
    setButtons([]);
    setSubmitting(false);
  }, [open, editingTemplate]);

  React.useEffect(() => {
    if (!open) return;
    if (editingTemplate) return;
    setExtras((prev) => {
      if (prev.localMediaObjectUrl) {
        URL.revokeObjectURL(prev.localMediaObjectUrl);
      }
      return createEmptyTemplateFormExtras();
    });
  }, [open, typeId, editingTemplate]);

  const showMixedSection = typeId === "mixed_interactive";
  const typeHint = getTemplateTypeHint(typeId);

  const previewMedia = React.useMemo(
    () => buildLivePreviewMedia(typeId, extras),
    [typeId, extras]
  );

  const previewButtons =
    typeId === "message_buttons"
      ? extras.messageButtons
      : showMixedSection
        ? buttons
        : undefined;

  function libraryPayload() {
    return {
      tags: pendingTags(),
      versions: versions.map((v) => v.trim()).filter(Boolean),
      variables: variables
        .map((v) => ({ key: normalizeVariableKey(v.key) ?? "", value: v.value.trim() }))
        .filter((v) => v.key),
      showIn,
    };
  }

  /** Saved tags plus whatever is still typed in the box. */
  function pendingTags(): string[] {
    const t = tagDraft.trim();
    return t && !tags.includes(t.toLowerCase()) ? [...tags, t.toLowerCase()] : tags;
  }

  function addTag() {
    const t = tagDraft.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagDraft("");
  }

  // Version 1 is `content`; the others live in `versions`.
  const allVersions = [content, ...versions];
  const currentText = allVersions[activeVersion] ?? content;
  function setCurrentText(v: string) {
    if (activeVersion === 0) setContent(v);
    else setVersions((prev) => prev.map((x, i) => (i === activeVersion - 1 ? v : x)));
  }
  function addVersion(text = "") {
    if (allVersions.length >= 5) return;
    setVersions((prev) => [...prev, text]);
    setActiveVersion(allVersions.length);
  }
  function removeVersion(index: number) {
    if (index === 0) return;
    setVersions((prev) => prev.filter((_, i) => i !== index - 1));
    setActiveVersion(0);
  }

  const customVars = variables.filter((v) => v.key !== "name" && v.key !== "phone");
  const nameFallback = variables.find((v) => v.key === "name")?.value ?? "";
  function setBuiltInFallback(key: "name" | "phone", value: string) {
    setVariables((prev) => {
      const rest = prev.filter((v) => v.key !== key);
      return value.trim() ? [{ key, value }, ...rest] : rest;
    });
  }
  const missingVars = undefinedVariableKeys([content, ...versions, footer], variables);

  const previewCtx = sample ? { name: "Rahim", phone: "+8801712345678" } : {};
  const previewBody = sample ? renderTemplateText(currentText, variables, previewCtx) : currentText;
  const previewFooter = sample ? renderTemplateText(footer, variables, previewCtx) : footer;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || (isTextRequired && !content.trim()) || submitting) return;

    const hasExistingFile = Boolean(editingTemplate?.media && "fileId" in editingTemplate.media && editingTemplate.media.fileId);
    const clientErr = validateTemplateCreateClient(typeId, extras, hasExistingFile);
    if (clientErr) {
      toast.error("Check the form", { description: clientErr });
      return;
    }

    setSubmitting(true);
    try {
      let uploadedFileId: string | undefined;
      if (templateTypeNeedsFileUpload(typeId) && extras.mediaFile) {
        const fd = new FormData();
        fd.append("file", extras.mediaFile);
        const meta = await apiFormJson<{
          id: string;
          mimeType: string;
          originalName: string;
          byteSize: number;
        }>("/v1/templates/media", fd);
        uploadedFileId = meta.id;
      }

      let mediaPayload = buildTemplateMediaPayload(
        typeId,
        extras,
        uploadedFileId
      );

      if (
        isEdit &&
        editingTemplate &&
        templateTypeNeedsFileUpload(typeId) &&
        !uploadedFileId &&
        !extras.externalMediaUrl.trim()
      ) {
        const fid =
          editingTemplate.media &&
          typeof editingTemplate.media === "object" &&
          "fileId" in editingTemplate.media &&
          typeof (editingTemplate.media as { fileId?: string }).fileId ===
            "string"
            ? (editingTemplate.media as { fileId: string }).fileId
            : undefined;
        if (fid) {
          mediaPayload = { ...(mediaPayload ?? {}), fileId: fid };
        }
      }

      const payloadButtons =
        typeId === "message_buttons"
          ? extras.messageButtons
          : showMixedSection && buttons.length > 0
            ? buttons
            : undefined;

      if (isEdit && editingTemplate) {
        const patch: Record<string, unknown> = {
          name: trimmedName,
          category: category.trim() || "general",
          content: content.trim(),
          footer: footer.trim() || undefined,
          ...libraryPayload(),
        };
        if (
          typeId === "message_buttons" ||
          typeId === "mixed_interactive"
        ) {
          patch.buttons = payloadButtons ?? [];
        }
        if (mediaPayload && Object.keys(mediaPayload).length > 0) {
          patch.media = mediaPayload;
        } else if (
          templateTypeNeedsFileUpload(typeId) &&
          editingTemplate.media &&
          typeof editingTemplate.media === "object" &&
          "fileId" in editingTemplate.media &&
          (editingTemplate.media as { fileId?: string }).fileId
        ) {
          patch.media = {
            fileId: (editingTemplate.media as { fileId: string }).fileId,
          };
        }
        const data = await apiJson<UpdateTemplateResponse>(
          `/v1/templates/${editingTemplate.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          }
        );
        onUpdated?.(messageTemplateApiToRecord(data.template));
        onOpenChange(false);
        return;
      }

      const payload = {
        name: trimmedName,
        category: category.trim() || "general",
        typeId,
        content: content.trim(),
        footer: footer.trim() || undefined,
        buttons: payloadButtons,
        ...libraryPayload(),
        ...(mediaPayload && Object.keys(mediaPayload).length > 0
          ? { media: mediaPayload }
          : {}),
      };

      const data = await apiJson<CreateTemplateResponse>("/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onCreated(messageTemplateApiToRecord(data.template));
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Could not update template."
            : "Could not create template.";
      toast.error(isEdit ? "Update failed" : "Create failed", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const typeTitle =
    TEMPLATE_TYPE_OPTIONS.find((x) => x.id === typeId)?.label ?? typeId;

  const isTextRequired = [
    "text_message",
    "message_buttons",
    "mixed_interactive",
    "message_list",
    "message_carousel",
    "cta_button",
    "copy_code",
    "flow_message"
  ].includes(typeId);

  const fieldClass = "h-11";
  const sectionClass = "space-y-3 rounded-xl border bg-card p-4 sm:p-5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none"
        showCloseButton={false}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b px-4 py-3 text-left sm:px-6">
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl font-semibold">
                {isEdit ? `Edit: ${editingTemplate?.name}` : "New template"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Write once, reuse in follow-ups, auto-replies, campaigns and live chat.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || (isTextRequired && !content.trim()) || submitting}>
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Save template"}
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
            <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-6 px-4 py-6 sm:px-6">
              <div className="min-w-0 flex-[999_1_560px] space-y-4">
                <section className={sectionClass}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tpl-name">Name</Label>
                      <Input
                        id="tpl-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Follow-up: price question"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tpl-folder">Folder</Label>
                      <Input
                        id="tpl-folder"
                        list="tpl-folder-options"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Follow-up"
                        maxLength={40}
                        className={fieldClass}
                      />
                      <datalist id="tpl-folder-options">
                        {folders.map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="tpl-tags">Tags</Label>
                      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5">
                        {tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                            {t}
                            <button
                              type="button"
                              aria-label={`Remove tag ${t}`}
                              className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                              onClick={() => setTags(tags.filter((x) => x !== t))}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          id="tpl-tags"
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addTag();
                            } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                              setTags(tags.slice(0, -1));
                            }
                          }}
                          onBlur={addTag}
                          placeholder={tags.length ? "" : "Add a tag and press Enter"}
                          className="min-w-[140px] flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <Label className="text-sm font-semibold">Message type</Label>
                  {isEdit ? (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{typeTitle}</span> (the type can’t change after saving)
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Message type">
                        {TEMPLATE_TYPE_OPTIONS.map((opt) => {
                          const on = typeId === opt.id;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setTypeId(opt.id)}
                              className={
                                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition " +
                                (on
                                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted")
                              }
                            >
                              <Icon className="size-4" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">{typeHint}</p>
                    </>
                  )}
                  <TemplateTypeExtrasFields key={typeId} typeId={typeId} extras={extras} setExtras={setExtras} />
                  {showMixedSection ? (
                    <TemplateInteractiveButtonsField buttons={buttons} onChange={setButtons} />
                  ) : null}
                </section>

                <section className={sectionClass}>
                  <TemplateTextEditor
                    versionCount={allVersions.length}
                    activeVersion={activeVersion}
                    onSelectVersion={setActiveVersion}
                    onAddVersion={addVersion}
                    onRemoveVersion={removeVersion}
                    allVersions={allVersions}
                    text={currentText}
                    onTextChange={setCurrentText}
                    variableKeys={["name", "phone", ...customVars.map((v) => v.key)]}
                  />
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="tpl-footer">Footer (optional)</Label>
                    <Input
                      id="tpl-footer"
                      value={footer}
                      onChange={(e) => setFooter(e.target.value)}
                      placeholder="Small grey line under the message"
                      className={fieldClass}
                    />
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Variables</p>
                      <p className="text-xs text-muted-foreground">
                        {"{name}"} and {"{phone}"} come from the contact. Add your own for text you reuse, like {"{plan}"} or {"{price}"}.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={customVars.length >= 15}
                      onClick={() => setVariables((prev) => [...prev, { key: "", value: "" }])}
                    >
                      + New variable
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_40px] gap-3 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <span>Variable</span>
                      <span>Value (or fallback when the contact has none)</span>
                      <span />
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_40px] items-center gap-3 border-t px-3 py-2">
                      <code className="text-sm text-primary">{"{name}"}</code>
                      <Input
                        aria-label="Fallback when the contact has no name"
                        value={nameFallback}
                        onChange={(e) => setBuiltInFallback("name", e.target.value)}
                        placeholder="Left out when empty, e.g. Sir"
                        className="h-9"
                      />
                      <span />
                    </div>
                    {variables.map((v, i) =>
                      v.key === "name" || v.key === "phone" ? null : (
                        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_40px] items-center gap-3 border-t px-3 py-2">
                          <Input
                            aria-label="Variable name"
                            value={v.key}
                            onChange={(e) =>
                              setVariables((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, key: e.target.value.replace(/[{}\s]/g, "").toLowerCase() } : x
                                )
                              )
                            }
                            placeholder="plan"
                            className="h-9 font-mono"
                          />
                          <Input
                            aria-label={`Value for ${v.key || "variable"}`}
                            value={v.value}
                            onChange={(e) =>
                              setVariables((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                            }
                            placeholder="Business"
                            className="h-9"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove variable ${v.key}`}
                            onClick={() => setVariables((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                  {missingVars.length > 0 ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Not defined yet: {missingVars.map((k) => `{${k}}`).join(", ")}. Add them above, or they are sent as typed.
                    </p>
                  ) : null}
                </section>

                <section className={sectionClass}>
                  <div>
                    <p className="text-sm font-semibold">Show this template in</p>
                    <p className="text-xs text-muted-foreground">
                      Pickers elsewhere only list templates switched on here, so each list stays short.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SHOW_IN_OPTIONS.map((o) => (
                      <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--primary)]"
                          checked={showIn.includes(o.id)}
                          onChange={(e) =>
                            setShowIn((prev) =>
                              e.target.checked ? ALL_SHOW_IN.filter((x) => prev.includes(x) || x === o.id) : prev.filter((x) => x !== o.id)
                            )
                          }
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="min-w-0 flex-[1_1_320px] space-y-3 lg:sticky lg:top-6 lg:max-w-[400px]" aria-label="Live preview">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Live preview</p>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={sample} onChange={(e) => setSample(e.target.checked)} />
                    Sample data
                  </label>
                </div>
                <div className="flex justify-center rounded-2xl border bg-card p-4">
                  <WhatsAppMessagePreview
                    contactLabel={sample ? "Rahim" : name.trim() || "Customer"}
                    body={previewBody}
                    footer={previewFooter}
                    buttons={previewButtons}
                    typeId={typeId}
                    media={previewMedia}
                    localMediaPreviewUrl={extras.localMediaObjectUrl}
                    localMediaMimeType={extras.mediaFile?.type ?? null}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing version {activeVersion + 1} of {allVersions.length}
                  {sample ? " with sample name “Rahim”." : " with raw {placeholders}."}
                </p>
              </aside>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
