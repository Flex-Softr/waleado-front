"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CodeSnippet({
  code,
  language = "bash",
  className,
  title,
}: {
  code: string;
  language?: string;
  className?: string;
  title?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code snippet copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy snippet");
    }
  };

  return (
    <div
      className={cn(
        "group relative my-2 overflow-hidden rounded-xl border border-border/80 bg-slate-950 font-mono text-xs text-slate-100 dark:border-border/40 dark:bg-slate-950",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-1.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-red-500/80" />
          <span className="inline-block size-2 rounded-full bg-amber-500/80" />
          <span className="inline-block size-2 rounded-full bg-emerald-500/80" />
          {title && <span className="ml-2 font-sans font-medium text-slate-300">{title}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase text-slate-400 tracking-wider text-[10px]">{language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Copy code"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3.5 leading-relaxed selection:bg-primary/30">
        <pre className="text-slate-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
