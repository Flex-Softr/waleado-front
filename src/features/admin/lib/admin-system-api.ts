import { apiJson } from "@/lib/api";

const json = { "Content-Type": "application/json" };

export type SystemMessagingSettings = {
  /** Admin-workspace WhatsApp device that sends OTPs, reminders and receipts. */
  senderDeviceId: string | null;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  requirePhoneVerification: boolean;
  /** Free-plan devices idle this many days are disconnected (0 = never). */
  idleFreeDeviceDays: number;
};

export type SenderDevice = {
  id: string;
  name: string;
  phone: string | null;
  connected: boolean;
  workspace: string;
};

export type SystemMessagingConfig = {
  settings: SystemMessagingSettings;
  smtpConfigured: boolean;
  senderDevices: SenderDevice[];
};

export type SystemTemplate = {
  key: string;
  label: string;
  variables: string[];
  /** Null when the template has no WhatsApp / email version. */
  whatsapp: string | null;
  email: { subject: string; body: string } | null;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  customized: boolean;
};

export type SystemTemplateUpdate = {
  whatsappBody?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
};

export function fetchSystemMessaging() {
  return apiJson<SystemMessagingConfig>("/v1/admin/system/messaging");
}

export function saveSystemMessaging(settings: SystemMessagingSettings) {
  return apiJson<SystemMessagingConfig>("/v1/admin/system/messaging", {
    method: "PUT",
    headers: json,
    body: JSON.stringify(settings),
  });
}

export function sendSystemTestMessage(input: {
  channel: "email" | "whatsapp";
  to: string;
}) {
  return apiJson<{ sent: true }>("/v1/admin/system/messaging/test", {
    method: "POST",
    headers: json,
    body: JSON.stringify(input),
  });
}

export function fetchSystemTemplates() {
  return apiJson<{ templates: SystemTemplate[] }>("/v1/admin/system/templates");
}

export function saveSystemTemplate(key: string, input: SystemTemplateUpdate) {
  return apiJson<{ template: SystemTemplate }>(
    `/v1/admin/system/templates/${key}`,
    {
      method: "PUT",
      headers: json,
      body: JSON.stringify(input),
    },
  );
}

export function resetSystemTemplate(key: string) {
  return apiJson<{ template: SystemTemplate }>(
    `/v1/admin/system/templates/${key}`,
    { method: "DELETE" },
  );
}
