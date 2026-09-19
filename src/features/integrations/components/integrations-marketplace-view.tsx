"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Code2,
  Filter,
  KeyRound,
  Plus,
  Puzzle,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CustomApiLogo,
} from "@/features/integrations/components/integration-icons";
import { IntegrationCard } from "@/features/integrations/components/integration-card";
import { IntegrationDetailsDialog } from "@/features/integrations/components/integration-details-dialog";
import { IntegrationQuickConnectBanner } from "@/features/integrations/components/integration-quick-connect-banner";
import { IntegrationRequestModal } from "@/features/integrations/components/integration-request-modal";
import { IntegrationStatsBar } from "@/features/integrations/components/integration-stats-bar";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS_LIST,
} from "@/features/integrations/data/integrations-data";
import { cn } from "@/lib/utils";
import type { IntegrationCategory, IntegrationItem, IntegrationStatus } from "@/types/integrations";

export function IntegrationsMarketplaceView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<IntegrationCategory>("All");
  const [statusFilter, setStatusFilter] = React.useState<"all" | IntegrationStatus>("all");

  const [selectedItem, setSelectedItem] = React.useState<IntegrationItem | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const [waitlistItem, setWaitlistItem] = React.useState<IntegrationItem | null>(null);
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);

  const filteredItems = React.useMemo(() => {
    return INTEGRATIONS_LIST.filter((item) => {
      // Category filter
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.shortDescription.toLowerCase().includes(q) || item.fullDescription.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesFeatures = item.keyFeatures.some((f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTags && !matchesFeatures) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, statusFilter]);

  const handleSelectItem = (item: IntegrationItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleOpenWaitlist = (item: IntegrationItem) => {
    setWaitlistItem(item);
    setWaitlistOpen(true);
  };

  const handleRequestNew = () => {
    setWaitlistItem(null);
    setWaitlistOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      {/* Top Title & Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Integrations & Marketplace
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              Official Store
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Extend Waleado with official billing modules, eCommerce plugins, and CRM bridges. Connect your systems via Open API to automate client WhatsApp communications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestNew}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            Request Integration
          </Button>

          <Link
            href="/api-credentials"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5 text-xs font-semibold shadow-xs"
            )}
          >
            <KeyRound className="size-3.5" />
            API Keys
          </Link>
        </div>
      </div>

      {/* High-level Marketplace Metrics */}
      <IntegrationStatsBar />

      {/* Quick Connect & Architecture Highlight Banner */}
      <IntegrationQuickConnectBanner />

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by keyword, platform (WHMCS, WordPress), or feature (2FA, Invoices)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-9 bg-card"
            />
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-border/80 bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Items ({INTEGRATIONS_LIST.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("available")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors flex items-center gap-1.5",
                statusFilter === "available"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Available
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("coming_soon")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors flex items-center gap-1.5",
                statusFilter === "coming_soon"
                  ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              Coming Soon
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {INTEGRATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap border",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border/80 hover:border-primary/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredItems.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              onSelect={handleSelectItem}
              onOpenWaitlist={handleOpenWaitlist}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
            <Boxes className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No integrations match your search</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search keywords or resetting category filters to browse all available modules.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setStatusFilter("all");
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Custom API / Webhook Integration Builder Card */}
      <Card className="border-border/80 bg-gradient-to-br from-card via-card/80 to-muted/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <CustomApiLogo className="size-12 shrink-0 rounded-xl" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-foreground">
                    Custom Webhook & Open API Integration
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Developer Toolkit
                  </Badge>
                </div>
                <CardDescription className="mt-1 text-xs text-muted-foreground">
                  Need to integrate Waleado with a proprietary CRM, custom ERP, Laravel, Django, Next.js, or Zapier? Use our standard Open API endpoints.
                </CardDescription>
              </div>
            </div>

            <Link
              href="/api-docs"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs shrink-0")}
            >
              <BookOpen className="size-3.5" />
              API Reference
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Single Message Dispatch</span>
              <code className="text-[11px] font-mono text-primary block">POST /v1/open/messages/single</code>
              <p className="text-[11px] text-muted-foreground">Send transactional OTPs and real-time alerts.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Contact & Group Sync</span>
              <code className="text-[11px] font-mono text-primary block">POST /v1/open/contact-groups</code>
              <p className="text-[11px] text-muted-foreground">Sync client phone numbers and audience lists.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Device Status Health</span>
              <code className="text-[11px] font-mono text-primary block">GET /v1/open/devices/default</code>
              <p className="text-[11px] text-muted-foreground">Validate active WhatsApp connection in real-time.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <span>Supported languages: cURL, PHP, Node.js, Python, Go, C#</span>
          </div>
          <Link
            href="/api-credentials"
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Create API Key
            <ArrowRight className="size-3.5" />
          </Link>
        </CardFooter>
      </Card>

      {/* Deep Detail Modal */}
      <IntegrationDetailsDialog
        item={selectedItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onOpenWaitlist={handleOpenWaitlist}
      />

      {/* Early Access / Waitlist Modal */}
      <IntegrationRequestModal
        item={waitlistItem}
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
      />
    </div>
  );
}
