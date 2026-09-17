"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarFooter({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <div className="mt-auto border-t border-sidebar-border p-3">
      <Link
        href="/profile"
        onClick={onNavigate}
        title={isCollapsed ? "Profile" : undefined}
        className={cn(
          "flex h-10 cursor-pointer items-center rounded-lg text-sm font-bold transition-colors duration-150",
          isCollapsed ? "justify-center px-2" : "gap-3 px-3",
          isActive
            ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <UserCircle
          className="size-[18px] shrink-0"
          strokeWidth={isActive ? 2.4 : 2}
        />
        {!isCollapsed && <span className="truncate">Profile</span>}
      </Link>
    </div>
  );
}
