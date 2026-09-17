export type OpenApiEndpointDoc = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  bodyExample?: string;
  responseExample?: string;
  notes?: string[];
};

/** Indent a multi-line JSON value for nesting inside the standard envelope. */
function envelope(message: string, dataJson: string): string {
  const indented = dataJson
    .trim()
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");
  return `{
  "success": true,
  "message": ${JSON.stringify(message)},
  "error": null,
  "errors": null,
  "data": ${indented}
}`;
}

export const OPEN_API_AUTH_HEADERS = [
  {
    name: "X-Client-Id",
    description: "Your public client ID (fw_cid_…)",
  },
  {
    name: "X-Client-Secret",
    description: "Your client secret (fw_csec_…) — shown once at creation",
  },
  {
    name: "Content-Type",
    description: "application/json for POST bodies",
  },
] as const;

export const OPEN_API_FLOW_STEPS = [
  "Create an API credential (client ID + secret) in the dashboard.",
  "Connect a WhatsApp device and mark it as the default device (Devices page).",
  "Send a single message with toPhone + bodyText (uses the default device).",
  "For bulk: list or create a contact group with phones, then create a campaign.",
  "Poll GET /v1/open/campaigns/:id for campaign status.",
] as const;

export const OPEN_API_RESPONSE_FORMAT = `{
  "success": true,
  "message": "Order report retrieved successfully.",
  "error": null,
  "errors": null,
  "data": []
}`;

export const OPEN_API_ERROR_FORMAT = `{
  "success": false,
  "message": "Invalid client credentials",
  "error": "UNAUTHORIZED",
  "errors": null,
  "data": null
}`;

export const OPEN_API_COMMON_ERRORS = [
  {
    code: "UNAUTHORIZED",
    message: "Missing or invalid X-Client-Id / X-Client-Secret",
  },
  {
    code: "NO_DEFAULT_DEVICE",
    message: "No connected default device is set for the workspace",
  },
  {
    code: "INVALID_PHONE",
    message: "Phone failed validation (country code required)",
  },
  {
    code: "NOT_ON_WHATSAPP",
    message: "Number is not registered on WhatsApp",
  },
  {
    code: "WA_SESSION_OFFLINE",
    message: "Default device WhatsApp session is offline",
  },
  {
    code: "VALIDATION_ERROR",
    message: "Request body failed validation (see errors)",
  },
  {
    code: "RATE_LIMIT",
    message: "Too many Open API requests",
  },
] as const;

export const OPEN_API_ENDPOINTS: OpenApiEndpointDoc[] = [
  {
    id: "devices-list",
    method: "GET",
    path: "/v1/open/devices",
    title: "List devices",
    description:
      "Returns workspace WhatsApp devices. Check isDefault to see which device Open API single send uses.",
    responseExample: envelope("Devices retrieved successfully.", `{
  "devices": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Sales phone",
      "status": "connected",
      "phone": "+14155552671",
      "isDefault": true
    }
  ]
}`),
    notes: [
      "Set the default device in the dashboard Devices page (connected devices only).",
      'status is "connected" or "qr_ready".',
    ],
  },
  {
    id: "validate-phone",
    method: "POST",
    path: "/v1/open/messages/validate-phone",
    title: "Validate phone",
    description:
      "Normalize and validate a phone number to E.164. Country code is required (with or without +).",
    bodyExample: `{
  "phone": "8801712345678"
}`,
    responseExample: envelope("Phone number validated successfully.", `{
  "valid": true,
  "e164": "+8801712345678"
}`),
    notes: [
      "Local numbers without a country code are rejected.",
      "Accepted forms: +8801XXXXXXXXX or 8801XXXXXXXXX.",
      "This endpoint checks format only — not WhatsApp registration.",
    ],
  },
  {
    id: "single-message",
    method: "POST",
    path: "/v1/open/messages/single",
    title: "Send single message",
    description:
      "Send one transactional WhatsApp text message via the workspace default device.",
    bodyExample: `{
  "toPhone": "+14155552671",
  "bodyText": "Your order #1234 is confirmed."
}`,
    responseExample: envelope("Message sent successfully.", `{
  "id": "00000000-0000-0000-0000-000000000010",
  "status": "sent",
  "kind": "text",
  "toPhone": "+14155552671",
  "deviceId": "00000000-0000-0000-0000-000000000001",
  "templateId": null,
  "bodyText": "Your order #1234 is confirmed.",
  "createdAt": "2026-08-05T04:00:00.000Z",
  "note": "Sent from device “Sales phone” via your linked WhatsApp."
}`),
    notes: [
      "Do not send deviceId or kind — Open API always sends text from the default device.",
      "toPhone must include a country code (with or without +).",
      "The number is checked on WhatsApp before send (NOT_ON_WHATSAPP if not registered).",
      "Requires a connected default device.",
    ],
  },
  {
    id: "send-media",
    method: "POST",
    path: "/v1/open/messages/media",
    title: "Send media message",
    description:
      "Send an image, video, audio note, or document via WhatsApp using your default device. Supports multipart/form-data upload or JSON with a public fileUrl or base64 data URI.",
    bodyExample: `{
  "toPhone": "+14155552671",
  "caption": "Check out our latest catalogue!",
  "fileUrl": "https://example.com/assets/catalogue.pdf",
  "fileName": "catalogue.pdf"
}`,
    responseExample: envelope("Message sent successfully.", `{
  "id": "00000000-0000-0000-0000-000000000020",
  "status": "sent",
  "kind": "media",
  "toPhone": "+14155552671",
  "deviceId": "00000000-0000-0000-0000-000000000001",
  "templateId": null,
  "bodyText": "Check out our latest catalogue!",
  "fileName": "catalogue.pdf",
  "createdAt": "2026-08-05T04:00:00.000Z",
  "note": "Sent from device “Sales phone” via your linked WhatsApp."
}`),
    notes: [
      "Send either a public fileUrl, a fileBase64 string (data URI), or upload a file using multipart/form-data with field name 'file'.",
      "Accepted formats: Images (PNG, JPG, WEBP, GIF), Videos (MP4), Audio (MP3, OGG, Opus), Documents (PDF, DOCX, XLSX, ZIP, TXT).",
      "Max file size is 16 MB for media and 30 MB for documents.",
      "Requires a connected default device.",
    ],
  },
  {
    id: "send-document",
    method: "POST",
    path: "/v1/open/messages/document",
    title: "Send document",
    description:
      "Send a PDF invoice, Word document, Excel spreadsheet, or archive to a recipient with a custom filename and optional caption.",
    bodyExample: `{
  "toPhone": "+14155552671",
  "caption": "Your invoice for order #INV-9821",
  "fileUrl": "https://example.com/invoices/inv-9821.pdf",
  "fileName": "invoice-9821.pdf"
}`,
    responseExample: envelope("Message sent successfully.", `{
  "id": "00000000-0000-0000-0000-000000000021",
  "status": "sent",
  "kind": "media",
  "toPhone": "+14155552671",
  "deviceId": "00000000-0000-0000-0000-000000000001",
  "templateId": null,
  "bodyText": "Your invoice for order #INV-9821",
  "fileName": "invoice-9821.pdf",
  "createdAt": "2026-08-05T04:00:00.000Z",
  "note": "Sent from device “Sales phone” via your linked WhatsApp."
}`),
    notes: [
      "If fileName is omitted, a filename will be inferred from the URL or MIME type.",
      "Also accepts multipart/form-data with field name 'file'.",
    ],
  },
  {
    id: "list-groups",
    method: "GET",
    path: "/v1/open/contact-groups",
    title: "List contact groups",
    description:
      "List all contact groups in the workspace with contact verification stats.",
    responseExample: envelope("Contact groups retrieved successfully.", `{
  "groups": [
    {
      "id": "00000000-0000-0000-0000-000000000099",
      "name": "VIP customers",
      "createdAt": "2026-08-05T04:00:00.000Z",
      "updatedAt": "2026-08-05T04:00:00.000Z",
      "stats": {
        "total": 120,
        "verified": 98,
        "unverified": 18,
        "invalid": 4
      }
    }
  ]
}`),
    notes: [
      "Groups are ordered by most recently updated first.",
      "Use a group id from this list when creating a campaign with selectionMode groups.",
    ],
  },
  {
    id: "create-group",
    method: "POST",
    path: "/v1/open/contact-groups",
    title: "Create contact group",
    description:
      "Create a contact group and optionally insert phone numbers in one request. Numbers are validated (country code required), de-duplicated, and WhatsApp-checked when a device session is online.",
    bodyExample: `{
  "name": "VIP customers",
  "phones": [
    "+14155552671",
    "8801712345678",
    "+14155552671"
  ]
}`,
    responseExample: envelope("Contact group created successfully.", `{
  "group": {
    "id": "00000000-0000-0000-0000-000000000099",
    "name": "VIP customers",
    "createdAt": "2026-08-05T04:00:00.000Z",
    "updatedAt": "2026-08-05T04:00:00.000Z",
    "stats": {
      "total": 2,
      "verified": 1,
      "unverified": 1,
      "invalid": 0
    }
  },
  "created": [
    {
      "id": "00000000-0000-0000-0000-000000000201",
      "name": "Contact",
      "phone": "+14155552671",
      "status": "verified",
      "createdAt": "2026-08-05T04:00:00.000Z",
      "updatedAt": "2026-08-05T04:00:00.000Z"
    }
  ],
  "skipped": [
    {
      "phone": "+14155552671",
      "reason": "Duplicate number"
    }
  ],
  "whatsappChecked": true
}`),
    notes: [
      "phones is optional (defaults to []). Omit it to create an empty group.",
      "Duplicate numbers in the request are skipped (first wins).",
      "If phones is non-empty but none are valid, the request fails and no group is created.",
      "Campaigns only send to verified contacts — check whatsappChecked / contact status.",
    ],
  },
  {
    id: "add-contact",
    method: "POST",
    path: "/v1/open/contact-groups/:groupId/contacts",
    title: "Add contact",
    description: "Add one phone to an existing group.",
    bodyExample: `{
  "name": "Jane Doe",
  "phone": "+14155552671"
}`,
    responseExample: envelope("Contact created successfully.", `{
  "contact": {
    "id": "00000000-0000-0000-0000-000000000201",
    "name": "Jane Doe",
    "phone": "+14155552671",
    "status": "unverified",
    "createdAt": "2026-08-05T04:00:00.000Z",
    "updatedAt": "2026-08-05T04:00:00.000Z"
  }
}`),
    notes: [
      "Prefer creating the group with phones when you already have the full list.",
      "Duplicate phones in the same group return DUPLICATE_PHONE.",
    ],
  },
  {
    id: "bulk-contacts",
    method: "POST",
    path: "/v1/open/contact-groups/:groupId/contacts/bulk",
    title: "Bulk add contacts",
    description:
      "Import many contacts into an existing group. Each line can be a phone or name,phone.",
    bodyExample: `{
  "lines": [
    "Jane,+14155552671",
    "+14155552672"
  ]
}`,
    responseExample: envelope("Contacts imported successfully.", `{
  "created": [],
  "skipped": []
}`),
    notes: [
      "Invalid or duplicate lines are returned in skipped without failing the whole request.",
      "Call revalidate-phones afterward if you need WhatsApp verification for campaigns.",
    ],
  },
  {
    id: "revalidate",
    method: "POST",
    path: "/v1/open/contact-groups/:groupId/actions/revalidate-phones",
    title: "Revalidate group phones",
    description:
      "Re-check number formatting and WhatsApp registration for contacts in the group. Campaigns only send to verified contacts.",
    responseExample: envelope("Contact phones revalidated successfully.", `{
  "updated": 12,
  "whatsappChecked": true
}`),
  },
  {
    id: "group-detail",
    method: "GET",
    path: "/v1/open/contact-groups/:groupId",
    title: "Get group detail",
    description:
      "Inspect group stats and contacts (including verification status) before starting a campaign.",
    responseExample: envelope("Contact group retrieved successfully.", `{
  "group": {
    "id": "00000000-0000-0000-0000-000000000099",
    "name": "VIP customers",
    "stats": {
      "total": 2,
      "verified": 1,
      "unverified": 1,
      "invalid": 0
    }
  },
  "contacts": []
}`),
  },
  {
    id: "create-campaign",
    method: "POST",
    path: "/v1/open/campaigns",
    title: "Create bulk campaign",
    description:
      "Start a bulk send. Prefer selectionMode groups with verified contacts from a contact group.",
    bodyExample: `{
  "name": "August promo",
  "deviceIds": ["00000000-0000-0000-0000-000000000001"],
  "kind": "text",
  "bodyText": "Hello from Waleado!",
  "selectionMode": "groups",
  "groupIds": ["00000000-0000-0000-0000-000000000099"],
  "scheduleType": "immediate",
  "deviceMode": "single"
}`,
    responseExample: envelope("Campaign created successfully.", `{
  "id": "00000000-0000-0000-0000-000000000301",
  "name": "August promo",
  "status": "running"
}`),
    notes: [
      'selectionMode can also be "manual" (with manualPhones) or "all_verified".',
      "delayMinSec / delayMaxSec / maxRetries have safe defaults if omitted.",
      "Unlike single send, campaigns still require deviceIds.",
    ],
  },
  {
    id: "campaign-detail",
    method: "GET",
    path: "/v1/open/campaigns/:id",
    title: "Get campaign status",
    description: "Poll campaign progress and result after creating a bulk send.",
    responseExample: envelope("Campaign retrieved successfully.", `{
  "id": "00000000-0000-0000-0000-000000000301",
  "name": "August promo",
  "status": "completed"
}`),
  },
];
