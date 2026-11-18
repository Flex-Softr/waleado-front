import type { TemplateShowIn, TemplateVariableApi } from "@/types/templates-api";
import type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";

export type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";

export type TemplateInteractiveKind =
  | "quick_reply"
  | "cta_url"
  | "cta_phone"
  | "copy_code";

export type TemplateInteractiveButton = {
  id: string;
  kind: TemplateInteractiveKind;
  label: string;
};

/** Saved with the template; mirrors server-normalized `media` JSON. */
export type TemplateMedia = {
  fileId?: string;
  mimeType?: string;
  originalName?: string;
  externalUrl?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactOrg?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  listSections?: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[];
  carouselCards?: { title?: string; body?: string; imageUrl?: string }[];
  ctaUrl?: string;
  ctaButtonLabel?: string;
  copyCodeValue?: string;
  flowId?: string;
};

export type MessageTemplateRecord = {
  id: string;
  name: string;
  /** Internal / Cloud API slug */
  waTemplateName: string;
  language: string;
  category: string;
  typeId: TemplateTypeId;
  content: string;
  footer?: string;
  buttons?: TemplateInteractiveButton[];
  media?: TemplateMedia | null;
  /** Inactive templates are hidden from send/campaign pickers. */
  active: boolean;
  tags: string[];
  versions: string[];
  variables: TemplateVariableApi[];
  showIn: TemplateShowIn[];
  usage: { autoReplies: number; campaigns: number; followUps: number; callResponders: number } | null;
  /** ISO time, for sorting. */
  updatedAt: string;
  createdAtLabel: string;
  updatedAtLabel: string;
};
