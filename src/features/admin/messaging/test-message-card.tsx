"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendSystemTestMessage } from "@/features/admin/lib/admin-system-api";
import { ApiError } from "@/lib/api";

type Channel = "whatsapp" | "email";

/** Sends one test message so the admin can confirm the sender device / SMTP really work. */
export function TestMessageCard() {
  const [channel, setChannel] = React.useState<Channel>("whatsapp");
  const [to, setTo] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await sendSystemTestMessage({ channel, to: to.trim() });
      toast.success("Test message sent");
    } catch (err) {
      toast.error("Test failed", { description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle>Send a test</CardTitle>
        <CardDescription>Uses the saved settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
          <select
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={channel === "whatsapp" ? "8801XXXXXXXXX" : "you@example.com"}
            required
          />
          <Button type="submit" variant="secondary" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
