"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Layers,
  Lock,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeSnippet } from "@/features/integrations/components/code-snippet";
import {
  CustomApiLogo,
  WhmcsLogo,
  WordPressLogo,
} from "@/features/integrations/components/integration-icons";
import { cn } from "@/lib/utils";
import type { IntegrationItem, MergeTagItem } from "@/types/integrations";

type TabKey = "overview" | "guide" | "architecture" | "mergetags" | "faqs";

export function IntegrationDetailsDialog({
  item,
  open,
  onOpenChange,
  onOpenWaitlist,
}: {
  item: IntegrationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenWaitlist?: (item: IntegrationItem) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [tagSearch, setTagSearch] = React.useState("");
  const [copiedTag, setCopiedTag] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setActiveTab("overview");
      setTagSearch("");
    }
  }, [open, item]);

  if (!item) return null;

  const handleCopyTag = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      toast.success(`Copied ${tag} to clipboard`);
      setTimeout(() => setCopiedTag(null), 1800);
    } catch {
      toast.error("Failed to copy tag");
    }
  };

  const filteredMergeTags = (item.mergeTags || []).filter(
    (mt) =>
      mt.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
      mt.description.toLowerCase().includes(tagSearch.toLowerCase()) ||
      (mt.category && mt.category.toLowerCase().includes(tagSearch.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border/90 shadow-2xl">
        {/* Modal Top Header */}
        <div className="relative border-b border-border/80 bg-slate-50/70 p-6 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {item.iconType === "whmcs" ? (
                <WhmcsLogo className="size-14 shrink-0 rounded-2xl shadow-lg" />
              ) : item.iconType === "wordpress" ? (
                <WordPressLogo className="size-14 shrink-0 rounded-2xl shadow-lg" />
              ) : (
                <CustomApiLogo className="size-14 shrink-0 rounded-2xl shadow-lg" />
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-foreground sm:text-2xl">
                    {item.name}
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.version}
                  </Badge>
                  {item.status === "available" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready to Install
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300">
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-amber-500" />
                      In Active Development
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-sm text-muted-foreground">
                  {item.tagline}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <ShieldCheck className="size-3.5 text-primary" />
                    {item.author.name}
                  </span>
                  <span>•</span>
                  <span>Category: <strong className="text-foreground">{item.category}</strong></span>
                  <span>•</span>
                  <span>Updated: {item.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 sm:self-start">
              {item.downloadUrl && item.status === "available" ? (
                <a
                  href={item.downloadUrl}
                  download={item.downloadFilename || "waleado-module.zip"}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "gap-2 bg-primary text-primary-foreground shadow-sm font-semibold hover:bg-primary/90"
                  )}
                >
                  <Download className="size-4" />
                  Download ZIP ({item.downloadSize})
                </a>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenWaitlist?.(item);
                  }}
                  className="gap-2 font-semibold"
                >
                  <Sparkles className="size-4 text-amber-400" />
                  Join Beta Waitlist
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation Navigation Bar */}
          <div className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-0 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="size-3.5" />
              Overview & Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                activeTab === "guide"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="size-3.5" />
              Installation Guideline
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                activeTab === "architecture"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" />
              System & API Architecture
            </button>
            {item.mergeTags && item.mergeTags.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("mergetags")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                  activeTab === "mergetags"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="size-3.5" />
                Merge Tags ({item.mergeTags.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("faqs")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                activeTab === "faqs"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <HelpCircle className="size-3.5" />
              FAQ & Troubleshooting
            </button>
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <ScrollArea className="flex-1 max-h-[calc(92vh-180px)] p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  About this Integration
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {item.fullDescription}
                </p>
              </div>

              {/* Key Features Grid */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Key Capabilities & Automated Triggers
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {item.keyFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 text-primary shrink-0" />
                            {feat.title}
                          </h4>
                          {feat.badge && (
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0">
                              {feat.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs leading-normal text-muted-foreground">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compatibility & Requirements Matrix */}
              <div className="rounded-xl border border-border/80 bg-slate-50/50 p-4 dark:bg-slate-900/30">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Compatibility Matrix & Technical Requirements
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Platform Version</span>
                    <strong className="font-semibold text-foreground mt-0.5 block">
                      {item.compatibility.platformVersion || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">PHP Environment</span>
                    <strong className="font-semibold text-foreground mt-0.5 block">
                      {item.compatibility.phpVersion || "PHP 8.1 / 8.2+"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Authentication</span>
                    <strong className="font-semibold text-foreground mt-0.5 block">
                      Open API Client ID & Secret
                    </strong>
                  </div>
                </div>

                {item.compatibility.testedWith && item.compatibility.testedWith.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground mr-1">Verified with:</span>
                    {item.compatibility.testedWith.map((t, idx) => (
                      <Badge key={idx} variant="outline" className="text-[11px] font-mono py-0">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links Banner */}
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="size-4 text-primary" />
                    Ready to connect this module?
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Generate your Open API Client ID and Secret in API Credentials.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/api-credentials"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}
                  >
                    API Credentials
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/devices"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}
                  >
                    <Smartphone className="size-3.5" />
                    Active Devices
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP INSTALLATION GUIDELINE */}
          {activeTab === "guide" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border/80 bg-slate-50/50 p-4 dark:bg-slate-900/30">
                <h3 className="text-sm font-semibold text-foreground">
                  Installation & Setup Guideline
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.guide.summary}
                </p>

                {item.guide.prerequisites.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                    <span className="text-xs font-semibold text-foreground">Prerequisites:</span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      {item.guide.prerequisites.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {item.guide.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="relative rounded-xl border border-border/80 bg-card p-4 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {step.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>

                        {step.codeSnippet && (
                          <CodeSnippet
                            code={step.codeSnippet}
                            language={step.codeLanguage || "bash"}
                            title={`Step ${step.stepNumber} Snippet`}
                          />
                        )}

                        {step.note && (
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                            <strong>Note:</strong> {step.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM & API ARCHITECTURE */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  How Waleado Integrates with {item.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  The integration communicates directly with Waleado Open API using enterprise-grade REST architecture. No third-party relays or proxies are involved.
                </p>
              </div>

              {/* Protocol & Auth Card */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                    <Lock className="size-4" />
                    Authentication Mechanism
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.architecture.authMethod}
                  </p>
                  <CodeSnippet
                    code={`X-Client-Id: fw_cid_your_client_id
X-Client-Secret: fw_csec_your_client_secret`}
                    language="http"
                    title="Required Headers"
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                    <Terminal className="size-4" />
                    Transport Protocol
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.architecture.protocol}
                  </p>
                  <div className="rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-slate-300">
                    <div>Latency: ~150ms - 400ms</div>
                    <div>Dispatch: Instant WebSocket to Device</div>
                    <div>Payload: JSON Encoded UTF-8</div>
                  </div>
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
                <div className="border-b border-border/80 bg-muted/40 px-4 py-2.5 text-xs font-semibold text-foreground">
                  API Endpoints Used by this Integration
                </div>
                <div className="divide-y divide-border/60">
                  {item.architecture.endpoints.map((ep, idx) => (
                    <div key={idx} className="p-3 text-xs font-mono text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {ep}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-sans">
                        Open API v1
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supported Event Hooks */}
              <div className="rounded-xl border border-border/80 bg-card p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Supported Platform Event Hooks
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {item.architecture.supportedHooks.map((hook, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="font-mono text-[11px] py-1 px-2.5"
                    >
                      {hook}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MERGE TAGS */}
          {activeTab === "mergetags" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Template Merge Tags Reference
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click any merge tag to copy it to your clipboard for use in templates.
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search merge tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
                <div className="grid grid-cols-12 border-b border-border/80 bg-muted/40 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground">
                  <div className="col-span-4">Merge Tag</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-3 text-right">Sample Value</div>
                </div>
                <div className="divide-y divide-border/60">
                  {filteredMergeTags.length > 0 ? (
                    filteredMergeTags.map((mt: MergeTagItem, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopyTag(mt.tag)}
                        className="grid grid-cols-12 items-center px-3.5 py-2.5 text-xs transition-colors hover:bg-muted/50 cursor-pointer group"
                      >
                        <div className="col-span-4 flex items-center gap-2 font-mono font-semibold text-primary">
                          <code>{mt.tag}</code>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
                            title="Copy tag"
                          >
                            {copiedTag === mt.tag ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                        <div className="col-span-5 text-muted-foreground">
                          {mt.description}
                          {mt.category && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0">
                              {mt.category}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-3 text-right font-mono text-[11px] text-foreground/80 truncate">
                          {mt.example}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No merge tags match &ldquo;{tagSearch}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FAQS & TROUBLESHOOTING */}
          {activeTab === "faqs" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Frequently Asked Questions & Troubleshooting
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Common questions regarding installation, configuration, and troubleshooting.
                </p>
              </div>

              <div className="space-y-3">
                {item.faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/80 bg-card p-4 space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <HelpCircle className="size-4 text-primary shrink-0" />
                      {faq.question}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground pl-6">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/80 bg-slate-50/70 p-4 dark:bg-slate-900/40 text-xs text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">Need custom modifications or dedicated support?</span>
                <p>
                  Our engineering team can help with custom hook implementations or private enterprise deployments. Visit API Credentials or explore our Open API Docs.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Modal Bottom Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Waleado Open API Suite &bull; Tested & Verified
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {item.downloadUrl && item.status === "available" ? (
              <a
                href={item.downloadUrl}
                download={item.downloadFilename || "waleado-whmcs.zip"}
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "gap-2 bg-primary text-primary-foreground font-semibold"
                )}
              >
                <Download className="size-4" />
                Download Module
              </a>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenWaitlist?.(item);
                }}
              >
                Join Beta Waitlist
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
