import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  BookOpen,
  Bot,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Phone,
  Reply,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
  FileText,
  Wallet,
} from "lucide-react";

import type { AuthUserRole } from "@/types/auth";

export type NavItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/** Customer product navigation organized by functional groups. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        title: "Overview",
        description: "Dashboard & analytics",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Devices",
        description: "WhatsApp Sessions",
        href: "/devices",
        icon: Smartphone,
      },
      {
        title: "Live Chat",
        description: "Inbox & conversations",
        href: "/live-chat",
        icon: MessageCircle,
      },
    ],
  },
  {
    title: "AI & Automation",
    items: [
      {
        title: "AI Skills",
        description: "Teach AI role, services & knowledge",
        href: "/ai-skills",
        icon: Sparkles,
      },
      {
        title: "AI Credentials",
        description: "Gemini & OpenRouter keys",
        href: "/ai-credentials",
        icon: KeyRound,
      },
      {
        title: "Chatbot",
        description: "Flows & assistants",
        href: "/chatbot",
        icon: Bot,
      },
      {
        title: "Auto Reply",
        description: "Automated Responses",
        href: "/auto-reply",
        icon: Reply,
      },
      {
        title: "Call Responder",
        description: "Call automation",
        href: "/call-responder",
        icon: Phone,
      },
    ],
  },
  {
    title: "Messaging",
    items: [
      {
        title: "Single Message",
        description: "Test Messages",
        href: "/single-message",
        icon: MessageSquare,
      },
      {
        title: "Bulk Messages",
        description: "Mass Messaging",
        href: "/bulk-messages",
        icon: MessagesSquare,
      },
      {
        title: "Templates",
        description: "Message Templates",
        href: "/templates",
        icon: FileText,
      },
      {
        title: "Contacts",
        description: "Contact Management",
        href: "/contacts",
        icon: UserRound,
      },
      {
        title: "Group Grabber",
        description: "Extract groups & communities",
        href: "/group-grabber",
        icon: Users,
      },
    ],
  },
  {
    title: "Developer & API",
    items: [
      {
        title: "Integrations",
        description: "WHMCS, WordPress & marketplace",
        href: "/integrations",
        icon: Blocks,
      },
      {
        title: "API Credentials",
        description: "Open API client keys",
        href: "/api-credentials",
        icon: LockKeyhole,
      },
      {
        title: "API Docs",
        description: "Open API reference",
        href: "/api-docs",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Billing & Plans",
    items: [
      {
        title: "Billing",
        description: "Plans & upgrades",
        href: "/billing",
        icon: CreditCard,
      },
    ],
  },
];

/** Platform admin navigation organized by functional groups. */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Admin Overview",
        description: "Platform ops dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Users",
        description: "Manage & block accounts",
        href: "/admin/users",
        icon: Users,
      },
    ],
  },
  {
    title: "Finance & Subscriptions",
    items: [
      {
        title: "Subscriptions",
        description: "Manage customer plans",
        href: "/admin/subscriptions",
        icon: CreditCard,
      },
      {
        title: "Payments",
        description: "Verify payment transactions",
        href: "/admin/payments",
        icon: Wallet,
      },
    ],
  },
];

/** Flat list of navigation items for backward compatibility */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
export const ADMIN_NAV_ITEMS: NavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

export function getNavGroupsForRole(role?: AuthUserRole | null): NavGroup[] {
  if (role === "ADMIN") {
    return ADMIN_NAV_GROUPS;
  }
  return NAV_GROUPS;
}

export function getNavItemsForRole(role?: AuthUserRole | null): NavItem[] {
  if (role === "ADMIN") {
    return ADMIN_NAV_ITEMS;
  }
  return NAV_ITEMS;
}
