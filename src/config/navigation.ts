import type { LucideIcon } from "lucide-react";
import {
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

/** Customer product navigation (all non-admin app pages). */
export const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    description: "Dashboard & analytics",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Billing",
    description: "Plans & upgrades",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Devices",
    description: "WhatsApp Sessions",
    href: "/devices",
    icon: Smartphone,
  },
  {
    title: "AI Credentials",
    description: "Gemini & OpenRouter keys",
    href: "/ai-credentials",
    icon: KeyRound,
  },
  {
    title: "AI Skills",
    description: "Teach AI role, services & knowledge",
    href: "/ai-skills",
    icon: Sparkles,
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
  {
    title: "Single Message",
    description: "Test Messages",
    href: "/single-message",
    icon: MessageSquare,
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
    title: "Bulk Messages",
    description: "Mass Messaging",
    href: "/bulk-messages",
    icon: MessagesSquare,
  },
  {
    title: "Auto Reply",
    description: "Automated Responses",
    href: "/auto-reply",
    icon: Reply,
  },
  {
    title: "Chatbot",
    description: "Flows & assistants",
    href: "/chatbot",
    icon: Bot,
  },
  {
    title: "Call Responder",
    description: "Call automation",
    href: "/call-responder",
    icon: Phone,
  },
  {
    title: "Live Chat",
    description: "Inbox & conversations",
    href: "/live-chat",
    icon: MessageCircle,
  },
  {
    title: "Group Grabber",
    description: "Extract groups & communities",
    href: "/group-grabber",
    icon: Users,
  },
];

/** Platform admin navigation (ops tasks — not customer product pages). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Admin Overview",
    description: "Platform ops dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    description: "Manage & block accounts",
    href: "/admin/users",
    icon: Users,
  },
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
];

export function getNavItemsForRole(role?: AuthUserRole | null): NavItem[] {
  if (role === "ADMIN") {
    return ADMIN_NAV_ITEMS;
  }
  return NAV_ITEMS;
}
