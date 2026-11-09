"use client";

import { FileText, Image as ImageIcon, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";

export type MessageFormType = "text" | "template";
export type SingleMessageFormType = "text" | "template" | "media";

type MessageTypeCardsProps<T extends SingleMessageFormType> = {
  value: T;
  /** Receives "media" only when `includeMedia` is set, so T may be the narrower MessageFormType. */
  onChange: (value: T) => void;
  includeMedia?: boolean;
};

export function MessageTypeCards<T extends SingleMessageFormType>({
  value,
  onChange: onChangeTyped,
  includeMedia = false,
}: MessageTypeCardsProps<T>) {
  const onChange = (next: SingleMessageFormType) => onChangeTyped(next as T);
  return (
    <div
      className={cn(
        "grid gap-3",
        includeMedia ? "sm:grid-cols-3" : "sm:grid-cols-2"
      )}
    >
      <button
        type="button"
        onClick={() => onChange("text")}
        className={cn(
          "flex min-h-32 flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
          value === "text"
            ? "border-foreground/20 bg-muted text-foreground ring-2 ring-foreground/10"
            : "border-border bg-card text-muted-foreground hover:bg-muted/50"
        )}
      >
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            value === "text"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          <MessageSquare className="size-5" />
        </span>
        <span className="font-semibold text-foreground">Text Message</span>
        <span className="text-sm leading-5 text-muted-foreground">
          Write a direct one-off WhatsApp message.
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange("template")}
        className={cn(
          "flex min-h-32 flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
          value === "template"
            ? "border-foreground/20 bg-muted text-foreground ring-2 ring-foreground/10"
            : "border-border bg-card text-muted-foreground hover:bg-muted/50"
        )}
      >
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            value === "template"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          <FileText className="size-5" />
        </span>
        <span className="font-semibold text-foreground">Template Message</span>
        <span className="text-sm leading-5 text-muted-foreground">
          Send from your saved template library.
        </span>
      </button>

      {includeMedia ? (
        <button
          type="button"
          onClick={() => onChange("media")}
          className={cn(
            "flex min-h-32 flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
            value === "media"
              ? "border-foreground/20 bg-muted text-foreground ring-2 ring-foreground/10"
              : "border-border bg-card text-muted-foreground hover:bg-muted/50"
          )}
        >
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              value === "media"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ImageIcon className="size-5" />
          </span>
          <span className="font-semibold text-foreground">Media & Document</span>
          <span className="text-sm leading-5 text-muted-foreground">
            Send image, video, audio, or document with caption.
          </span>
        </button>
      ) : null}
    </div>
  );
}
