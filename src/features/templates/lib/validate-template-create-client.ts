import type { TemplateTypeId } from "@/features/templates/config/template-type-definitions";
import { templateTypeNeedsFileUpload } from "@/features/templates/lib/build-template-media-payload";
import type { TemplateFormExtras } from "@/features/templates/types/template-form-extras";

export function validateTemplateCreateClient(
  typeId: TemplateTypeId,
  extras: TemplateFormExtras,
  hasExistingFile: boolean = false
): string | null {
  if (templateTypeNeedsFileUpload(typeId)) {
    const hasFile = !!extras.mediaFile || hasExistingFile;
    const hasUrl = !!extras.externalMediaUrl.trim();
    if (!hasFile && !hasUrl) {
      return "Upload a file or paste a public https URL for this template.";
    }
  }

  if (typeId === "message_location") {
    const lat = Number.parseFloat(extras.latitude);
    const lng = Number.parseFloat(extras.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return "Enter valid latitude and longitude.";
    }
  }

  if (typeId === "message_contact") {
    if (!extras.contactName.trim() || !extras.contactPhone.trim()) {
      return "Contact template needs a name and phone number.";
    }
  }

  if (typeId === "message_poll") {
    const opts = extras.pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!extras.pollQuestion.trim()) {
      return "Poll needs a question.";
    }
    if (opts.length < 2) {
      return "Add at least two poll options.";
    }
  }

  if (typeId === "message_list") {
    const ok = extras.listSections.some((s) =>
      s.rows.some((r) => r.title.trim())
    );
    if (!ok) {
      return "List template needs at least one row with a title.";
    }
  }

  if (typeId === "message_carousel") {
    const ok = extras.carouselCards.some(
      (c) => c.title.trim() || c.body.trim() || c.imageUrl.trim()
    );
    if (!ok) {
      return "Add at least one carousel card (title, body, or image URL).";
    }
  }

  if (typeId === "cta_button") {
    if (!extras.ctaUrl.trim() || !extras.ctaButtonLabel.trim()) {
      return "CTA template needs a URL and button label.";
    }
    try {
      const u = new URL(extras.ctaUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return "CTA URL must start with http:// or https://";
      }
    } catch {
      return "Enter a valid CTA URL.";
    }
  }

  if (typeId === "copy_code") {
    if (!extras.copyCode.trim()) {
      return "Enter the code recipients will copy.";
    }
  }

  if (typeId === "flow_message") {
    if (!extras.flowId.trim()) {
      return "Enter your WhatsApp Flow ID.";
    }
  }

  if (typeId === "message_buttons") {
    if (extras.messageButtons.length < 1 || extras.messageButtons.length > 3) {
      return "Add between 1 and 3 buttons.";
    }
  }

  return null;
}
