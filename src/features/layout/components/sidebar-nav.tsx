"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { getNavGroupsForRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SidebarNav({
  onNavigate,
  isCollapsed,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const navGroups = getNavGroupsForRole(user?.role);
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return (
    <ScrollArea className="min-h-0 flex-1 px-3 py-2">
      <nav className="flex flex-col gap-3 pb-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.title || groupIndex} className="flex flex-col gap-1">
            {isCollapsed ? (
              groupIndex > 0 ? (
                <div
                  className="my-1.5 mx-1 h-px bg-sidebar-border/70"
                  aria-hidden="true"
                />
              ) : null
            ) : (
              group.title && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75 select-none">
                  {group.title}
                </div>
              )
            )}

            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/" || item.href === "/admin"
                    ? normalizedPath === item.href
                    : normalizedPath === item.href ||
                      normalizedPath.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={isCollapsed ? item.title : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-9 cursor-pointer items-center rounded-lg text-sm font-bold transition-colors duration-150",
                      isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                      active
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
