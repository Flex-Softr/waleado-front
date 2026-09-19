"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CustomApiLogo,
  WhmcsLogo,
  WordPressLogo,
} from "@/features/integrations/components/integration-icons";
import { cn } from "@/lib/utils";
import type { IntegrationItem } from "@/types/integrations";

export function IntegrationCard({
  item,
  onSelect,
  onOpenWaitlist,
}: {
  item: IntegrationItem;
  onSelect: (item: IntegrationItem) => void;
  onOpenWaitlist: (item: IntegrationItem) => void;
}) {
  const isAvailable = item.status === "available";

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden border-border/80 bg-card/80 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg dark:bg-card/40">
      {/* Top Banner & Header */}
      <div>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {item.iconType === "whmcs" ? (
                <WhmcsLogo className="size-12 shrink-0 rounded-xl" />
              ) : item.iconType === "wordpress" ? (
                <WordPressLogo className="size-12 shrink-0 rounded-xl" />
              ) : (
                <CustomApiLogo className="size-12 shrink-0 rounded-xl" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-foreground">
                    {item.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] font-semibold">{item.version}</span>
                  <span>•</span>
                  <span>{item.category}</span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            {isAvailable ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[11px] font-medium dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                Ready to Install
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-[11px] font-medium dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
                Coming Soon
              </Badge>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {item.badges.map((badge, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] font-medium tracking-tight"
              >
                {badge}
              </Badge>
            ))}
          </div>

          <CardDescription className="pt-2 text-xs leading-relaxed text-muted-foreground/90 line-clamp-3">
            {item.shortDescription}
          </CardDescription>
        </CardHeader>

        {/* Feature Highlights */}
        <CardContent className="space-y-3 pb-4">
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Core Capabilities:
            </span>
            <ul className="space-y-1 text-xs text-foreground/90">
              {item.keyFeatures.slice(0, 3).map((feat, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{feat.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Compatibility Row */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            <span>
              Target: <strong className="text-foreground">{item.compatibility.platformVersion?.split(" ")[0]} {item.compatibility.platformVersion?.split(" ")[1]}</strong>
            </span>
            <span>
              PHP: <strong className="text-foreground">{item.compatibility.phpVersion?.split(" ")[0] || "8.1+"}</strong>
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-500">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {item.rating} <span className="text-muted-foreground font-normal">({item.reviewsCount})</span>
            </span>
          </div>
        </CardContent>
      </div>

      {/* Footer Actions */}
      <CardFooter className="flex flex-col gap-2 pt-2 border-t border-border/60 bg-muted/20">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(item)}
            className="w-full text-xs font-semibold gap-1.5 group-hover:border-primary/40"
          >
            <BookOpen className="size-3.5 text-primary" />
            Setup & Details
          </Button>

          {isAvailable && item.downloadUrl ? (
            <a
              href={item.downloadUrl}
              download={item.downloadFilename || "waleado-whmcs.zip"}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "w-full text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 shadow-xs"
              )}
            >
              <Download className="size-3.5" />
              Download ZIP
            </a>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenWaitlist(item)}
              className="w-full text-xs font-semibold gap-1.5"
            >
              <Sparkles className="size-3.5 text-amber-400" />
              Join Waitlist
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
