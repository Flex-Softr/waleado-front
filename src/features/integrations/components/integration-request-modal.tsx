"use client";

import * as React from "react";
import { Check, Mail, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IntegrationItem } from "@/types/integrations";

export function IntegrationRequestModal({
  item,
  open,
  onOpenChange,
}: {
  item: IntegrationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsSubmitted(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      toast.error("Please provide either your email or WhatsApp phone number.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      toast.success("Thank you! You've been added to the early access list.");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-2">
            <Sparkles className="size-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            {item ? `Early Beta Access: ${item.name}` : "Request a New Integration"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {item
              ? `Be the first to download and test the ${item.name} when our private beta build launches.`
              : "Tell our product team which billing, eCommerce, or CRM tool you want Waleado to support next."}
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">You&apos;re on the VIP list!</h4>
              <p className="text-xs text-muted-foreground">
                We will notify you on WhatsApp and email as soon as the package is ready for download.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="mt-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-email" className="text-xs">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="req-email"
                  type="email"
                  placeholder="yourname@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-phone" className="text-xs">
                WhatsApp Phone Number (with country code)
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="req-phone"
                  type="tel"
                  placeholder="+88017XXXXXXXX or +14155552671"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-notes" className="text-xs">
                Key Features or Specific Workflows You Need
              </Label>
              <Textarea
                id="req-notes"
                placeholder="e.g., WooCommerce custom order statuses, OTP on checkout, abandoned cart recovery timing..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="gap-2 bg-primary font-semibold"
              >
                <Send className="size-3.5" />
                {loading ? "Submitting..." : "Join Waitlist"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
