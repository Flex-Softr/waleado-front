export type PageMeta = {
  title: string;
  description: string;
};

export const PAGE_META = {
  "/": {
    title: "Dashboard Overview",
    description: "WhatsApp automation performance at a glance.",
  },
  "/devices": {
    title: "Devices",
    description: "Manage your WhatsApp sessions and connections.",
  },
  "/ai-credentials": {
    title: "AI Credentials",
    description: "Store Gemini and OpenRouter API keys for AI replies.",
  },
  "/ai-skills": {
    title: "AI Skills",
    description: "Teach AI role, services, and business knowledge for continuous chat auto-reply.",
  },
  "/api-credentials": {
    title: "API Credentials",
    description: "Create and revoke Open API client ID and secret keys.",
  },
  "/api-docs": {
    title: "Open API docs",
    description: "Authenticate and call single and bulk messaging endpoints.",
  },
  "/single-message": {
    title: "Single Message",
    description: "Send Test messages with different Templates.",
  },
  "/templates": {
    title: "Templates",
    description: "Create and manage reusable message templates.",
  },
  "/contacts": {
    title: "Contacts",
    description: "Import, organize and manage your contacts.",
  },
  "/bulk-messages": {
    title: "Bulk Messages",
    description: "Reach many recipients with compliant campaigns.",
  },
  "/auto-reply": {
    title: "Auto Reply",
    description: "Set up automatic keyword-based responses.",
  },
  "/chatbot": {
    title: "Chatbot",
    description: "Configure AI-powered conversations.",
  },
  "/call-responder": {
    title: "Call Responder",
    description: "Manage call automation responses.",
  },
  "/live-chat": {
    title: "Live Chat",
    description: "WhatsApp Automation Platform.",
  },
  "/group-grabber": {
    title: "Group Grabber",
    description: "WhatsApp Automation Platform.",
  },
  "/profile": {
    title: "Profile",
    description: "Your account, workspace membership, and sign-out.",
  },
  "/billing": {
    title: "Plans & billing",
    description: "Upgrade your workspace or manage your subscription.",
  },
  "/notifications": {
    title: "Notifications",
    description: "View and manage your account and system notifications.",
  },
  "/billing/success": {
    title: "Subscription confirmed",
    description: "Your plan is being activated.",
  },
  "/admin": {
    title: "Admin Overview",
    description: "Platform operations dashboard.",
  },
  "/admin/users": {
    title: "Users",
    description: "Manage and block customer accounts.",
  },
  "/admin/subscriptions": {
    title: "Subscriptions",
    description: "Review and manage customer subscriptions.",
  },
  "/admin/payments": {
    title: "Payments",
    description: "Verify and reconcile payment transactions.",
  },
  "/login": {
    title: "Sign in",
    description: "Access your Waleado workspace.",
  },
  "/register": {
    title: "Create account",
    description: "Start automating WhatsApp with Waleado.",
  },
} as const satisfies Record<string, PageMeta>;

export type PagePath = keyof typeof PAGE_META;

export function getPageMeta(pathname: string): PageMeta {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (normalized in PAGE_META) {
    return PAGE_META[normalized as PagePath];
  }
  if (
    normalized.startsWith("/contacts/") &&
    normalized !== "/contacts"
  ) {
    return PAGE_META["/contacts"];
  }
  if (
    normalized.startsWith("/bulk-messages/") &&
    normalized !== "/bulk-messages"
  ) {
    return {
      title: "Campaign details",
      description: PAGE_META["/bulk-messages"].description,
    };
  }
  return {
    title: "Waleado",
    description: "WhatsApp automation for your team.",
  };
}
