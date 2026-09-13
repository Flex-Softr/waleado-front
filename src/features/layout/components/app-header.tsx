"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  SunMedium,
  UserCircle,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import { userDisplayName, userInitials } from "@/lib/user-display";
import { MobileSidebar } from "@/features/layout/components/mobile-sidebar";
import { useSidebar } from "@/features/layout/sidebar-context";
import { NotificationPopover } from "@/features/notifications/components/notification-popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const router = useRouter();
  const { license, hydrated, isTrial, isTrialExpired, daysRemaining } = useSubscription();
  const { user: authUser, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center border-b border-border/80 bg-background/92 px-4 backdrop-blur-xl sm:px-6 lg:px-7">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="size-10 rounded-full text-foreground hover:bg-muted transition-colors"
          >
            {mounted ? (
              isDark ? (
                <SunMedium className="size-[20px]" />
              ) : (
                <Moon className="size-[20px]" />
              )
            ) : (
              <Moon className="size-[20px]" />
            )}
          </Button>
          <NotificationPopover />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="group relative flex h-10 shrink-0 items-center gap-2 rounded-full border border-border/80 bg-card/60 p-1 pr-2 text-left transition-all duration-200 hover:border-border hover:bg-muted/80 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5 sm:pr-3"
                  aria-label="Open user menu"
                />
              }
            >
              <div className="relative flex size-8 shrink-0 items-center justify-center">
                <Avatar className="size-8 ring-1 ring-border/80">
                  <AvatarFallback className="bg-gradient-to-tr from-[#8d6ae8] to-[#5d35bd] text-xs font-semibold text-white">
                    {authUser ? userInitials(authUser) : "?"}
                  </AvatarFallback>
                </Avatar>
                {hydrated && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
                      authUser?.role === "ADMIN" || license.isUpgraded
                        ? "bg-emerald-500"
                        : isTrialExpired
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    )}
                    title={
                      authUser?.role === "ADMIN"
                        ? "Administrator — Full Access"
                        : license.isUpgraded
                        ? "Active subscription"
                        : isTrialExpired
                        ? "Trial expired — payment required"
                        : `3-day trial active (${daysRemaining ?? 3}d left)`
                    }
                  />
                )}
              </div>

              <div className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-foreground max-w-[120px]">
                    {authUser ? userDisplayName(authUser) : "Account"}
                  </span>
                  {hydrated && (
                    authUser?.role === "ADMIN" ? (
                      <span className="rounded-full bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-bold text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                        ADMIN
                      </span>
                    ) : license.isUpgraded ? (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {license.tierLabel.toUpperCase()}
                      </span>
                    ) : isTrialExpired ? (
                      <span className="rounded-full bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        TRIAL
                      </span>
                    )
                  )}
                </div>
                <span className="truncate text-[10px] font-medium text-muted-foreground">
                  {hydrated
                    ? authUser?.role === "ADMIN"
                      ? "Full Access"
                      : license.isUpgraded && license.daysRemaining != null
                      ? `${license.daysRemaining}d left`
                      : isTrialExpired
                      ? "Payment required"
                      : isTrial
                      ? `${daysRemaining ?? 3}d left`
                      : license.tierLabel
                    : "…"}
                </span>
              </div>

              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-64 rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
            >
              <DropdownMenuLabel className="p-2.5 font-normal">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 ring-1 ring-border/80">
                    <AvatarFallback className="bg-gradient-to-tr from-[#8d6ae8] to-[#5d35bd] text-xs font-semibold text-white">
                      {authUser ? userInitials(authUser) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {authUser ? userDisplayName(authUser) : "Account"}
                    </span>
                    {authUser?.email && (
                      <span className="truncate text-xs text-muted-foreground">
                        {authUser.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                  <span className="font-medium text-muted-foreground">Subscription</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        authUser?.role === "ADMIN" || license.isUpgraded
                          ? "default"
                          : isTrialExpired
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] font-semibold px-2 py-0.5"
                    >
                      {hydrated ? (authUser?.role === "ADMIN" ? "Admin Access" : license.tierLabel) : "…"}
                    </Badge>
                    {hydrated && authUser?.role !== "ADMIN" && !license.isUpgraded && !isTrialExpired && daysRemaining != null && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        ({daysRemaining}d left)
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent focus:bg-accent"
                onClick={() => router.push("/profile")}
              >
                <UserCircle className="size-4 text-muted-foreground" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent focus:bg-accent"
                onClick={() => router.push("/billing")}
              >
                <CreditCard className="size-4 text-muted-foreground" />
                <span>Billing & Plans</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
              >
                <LogOut className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
