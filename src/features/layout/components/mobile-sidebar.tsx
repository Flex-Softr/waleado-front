"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { BrandMark } from "@/features/layout/components/brand-mark";
import { SidebarFooter } from "@/features/layout/components/sidebar-footer";
import { SidebarNav } from "@/features/layout/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden size-10 shrink-0 rounded-full bg-card text-foreground shadow-sm"
            aria-label="Open navigation"
          />
        }
      >
        <Menu className="size-[20px]" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:w-[280px]"
      >
        <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-[68px] shrink-0 items-center border-b border-sidebar-border px-4">
            <BrandMark />
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
          <SidebarFooter onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
