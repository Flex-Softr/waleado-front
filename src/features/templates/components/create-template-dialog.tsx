"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { TEMPLATE_TYPE_OPTIONS } from "@/features/templates/config/template-type-definitions";
import type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";
import { getTemplateTypeHint } from "@/features/templates/config/template-type-definitions";
import { TEMPLATE_CATEGORIES } from "@/features/templates/config/template-categories";
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
import { TemplateTypeOptionCard } from "@/features/templates/components/template-type-option-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: MessageTemplateRecord) => void;
  /** Edit mode: pre-fills the form and PATCHes on save. */
  editingTemplate?: MessageTemplateRecord | null;
  onUpdated?: (template: MessageTemplateRecord) => void;
};

const defaultType: TemplateTypeId = "text_message";

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
  editingTemplate = null,
  onUpdated,
}: CreateTemplateDialogProps) {
  const isEdit = Boolean(editingTemplate);
  const [typeId, setTypeId] = React.useState<TemplateTypeId>(defaultType);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("general");
  const [content, setContent] = React.useState("");
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
          category: category as (typeof TEMPLATE_CATEGORIES)[number]["value"],
          content: content.trim(),
          footer: footer.trim() || undefined,
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
        category: category as (typeof TEMPLATE_CATEGORIES)[number]["value"],
        typeId,
        content: content.trim(),
        footer: footer.trim() || undefined,
        buttons: payloadButtons,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,840px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              {isEdit ? (
                <Pencil className="size-5" />
              ) : (
                <Plus className="size-5" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl font-semibold">
                {isEdit ? "Edit template" : "Create New Template"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {isEdit
                  ? "Update content and options. Message type and WhatsApp slug stay the same."
                  : "Define a reusable layout for WhatsApp. Extra fields appear for image, document, location, polls, lists, and other message types."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
              {showMixedSection ? (
                <p className="text-sm text-muted-foreground">
                  Combine normal buttons, CTA URLs, phone calls, and copy codes.
                </p>
              ) : null}

              <div className="space-y-3">
                <Label className="text-sm font-medium">Template Type</Label>
                {isEdit ? (
                  <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {typeTitle}
                    </span>
                    <span className="ml-2 font-mono text-xs">
                      · {editingTemplate?.waTemplateName}
                    </span>
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                      <TemplateTypeOptionCard
                        key={opt.id}
                        label={opt.label}
                        icon={opt.icon}
                        selected={typeId === opt.id}
                        onSelect={() => setTypeId(opt.id)}
                      />
                    ))}
                  </div>
                )}
                {!isEdit ? (
                  <p className="text-xs text-muted-foreground">{typeHint}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome Message"
                    className="h-10 border-sky-200 focus-visible:border-sky-400 dark:border-sky-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-cat">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v ?? "general")}
                    items={TEMPLATE_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                  >
                    <SelectTrigger id="tpl-cat" className="h-10 w-full">
                      <SelectValue placeholder="General" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-body">Message Content</Label>
                <Textarea
                  id="tpl-body"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your message content here... Use {{variable}} for dynamic content"
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground">
                  Use double curly braces for variables: {"{{product}}"},{" "}
                  {"{{date}}"}, {"{{location}}"}
                </p>
              </div>

              <TemplateTypeExtrasFields
                key={typeId}
                typeId={typeId}
                extras={extras}
                setExtras={setExtras}
              />

              {showMixedSection ? (
                <TemplateInteractiveButtonsField
                  buttons={buttons}
                  onChange={setButtons}
                />
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="tpl-footer">Footer Text (Optional)</Label>
                <Input
                  id="tpl-footer"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Optional footer text"
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col border-t border-slate-200 bg-slate-50/90 px-4 py-5 dark:border-slate-800 dark:bg-slate-900/40 lg:w-[min(380px,38%)] lg:border-l lg:border-t-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Live preview
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Approximate recipient view on WhatsApp while you edit.
              </p>
              <div className="mt-4 flex flex-1 items-start justify-center overflow-y-auto pb-2 lg:min-h-0">
                <WhatsAppMessagePreview
                  contactLabel={name.trim() || "Your business"}
                  body={content}
                  footer={footer}
                  buttons={previewButtons}
                  typeId={typeId}
                  media={previewMedia}
                  localMediaPreviewUrl={extras.localMediaObjectUrl}
                  localMediaMimeType={extras.mediaFile?.type ?? null}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || (isTextRequired && !content.trim()) || submitting}
            >
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
