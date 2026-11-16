"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { ContactGroupDetailResponse, ContactGroupsListResponse, ContactGroupListItemApi } from "@/types/contacts-api";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import type { FollowUpApi, FollowUpCreateResponse } from "@/types/follow-ups-api";
import type { LiveChatThreadsListResponse } from "@/types/live-chat-api";
import { ApiError, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Source = "type" | "chats" | "contacts";
type Person = { phone: string; name: string };

const SOURCES: { id: Source; label: string }[] = [
  { id: "type", label: "Type a number" },
  { id: "chats", label: "From chats" },
  { id: "contacts", label: "From contacts" },
];

const PRESETS: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
];

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

/** Local date-time for <input type="datetime-local">, `days` from now at 10:00. */
function presetValue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function PersonPicker({
  people,
  loading,
  emptyText,
  onPick,
}: {
  people: Person[];
  loading: boolean;
  emptyText: string;
  onPick: (p: Person) => void;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const shown = (q
    ? people.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
    : people
  ).slice(0, 50);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (people.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or number"
        aria-label="Search people"
      />
      <div className="max-h-44 overflow-y-auto rounded-lg border">
        {shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No match.</p>
        ) : (
          shown.map((p) => (
            <button
              key={p.phone}
              type="button"
              onClick={() => onPick(p)}
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
            >
              <span className="truncate font-medium">{p.name || p.phone}</span>
              {p.name ? <span className="shrink-0 text-xs text-muted-foreground">{p.phone}</span> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Mount only while open so every opening starts with a clean form. */
export function AddFollowUpDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (item: FollowUpApi) => void;
}) {
  const [devices, setDevices] = React.useState<DeviceApiRecord[] | null>(null);
  const [deviceId, setDeviceId] = React.useState("");
  const [source, setSource] = React.useState<Source>("type");
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [date, setDate] = React.useState(() => presetValue(1));
  const [message, setMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [chats, setChats] = React.useState<{ deviceId: string; people: Person[] } | null>(null);
  const [groups, setGroups] = React.useState<ContactGroupListItemApi[] | null>(null);
  const [groupId, setGroupId] = React.useState("");
  const [contacts, setContacts] = React.useState<{ groupId: string; people: Person[] } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<DevicesListResponse>("/v1/devices");
        if (cancelled) return;
        setDevices(res.devices);
        const first =
          res.devices.find((d) => d.isDefault && d.status === "connected") ??
          res.devices.find((d) => d.status === "connected") ??
          res.devices[0];
        if (first) setDeviceId(first.id);
      } catch (err) {
        if (!cancelled) {
          setDevices([]);
          toast.error("Could not load your WhatsApp numbers", {
            description: errMessage(err, "Please try again."),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadChats(forDevice: string) {
    if (!forDevice || chats?.deviceId === forDevice) return;
    try {
      const res = await apiJson<LiveChatThreadsListResponse>(
        `/v1/live-chat/threads?deviceId=${encodeURIComponent(forDevice)}`
      );
      setChats({
        deviceId: forDevice,
        people: res.threads.map((t) => ({ phone: t.peerPhone, name: t.peerLabel.trim() })),
      });
    } catch (err) {
      setChats({ deviceId: forDevice, people: [] });
      toast.error("Could not load chats", { description: errMessage(err, "Please try again.") });
    }
  }

  async function loadGroups() {
    if (groups) return;
    try {
      const res = await apiJson<ContactGroupsListResponse>("/v1/contact-groups");
      setGroups(res.groups);
    } catch (err) {
      setGroups([]);
      toast.error("Could not load contact groups", { description: errMessage(err, "Please try again.") });
    }
  }

  async function loadContacts(forGroup: string) {
    setGroupId(forGroup);
    if (!forGroup) return;
    try {
      const res = await apiJson<ContactGroupDetailResponse>(`/v1/contact-groups/${forGroup}`);
      setContacts({
        groupId: forGroup,
        people: res.contacts
          .filter((c) => c.status !== "invalid")
          .map((c) => ({ phone: c.phone, name: c.name.trim() })),
      });
    } catch (err) {
      setContacts({ groupId: forGroup, people: [] });
      toast.error("Could not load contacts", { description: errMessage(err, "Please try again.") });
    }
  }

  function chooseSource(next: Source) {
    setSource(next);
    if (next === "chats") void loadChats(deviceId);
    if (next === "contacts") void loadGroups();
  }

  function chooseDevice(next: string) {
    setDeviceId(next);
    if (source === "chats") void loadChats(next);
  }

  function pick(p: Person) {
    setPhone(p.phone);
    setName(p.name);
  }

  const when = date ? new Date(date) : null;
  const validDate = Boolean(when && !Number.isNaN(when.getTime()));
  const canSubmit =
    !saving && deviceId.length > 0 && phone.trim().length >= 6 && message.trim().length > 0 && validDate;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !when) return;
    setSaving(true);
    try {
      const res = await apiJson<FollowUpCreateResponse>("/v1/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          phone: phone.trim(),
          name: name.trim() || null,
          note: note.trim() || null,
          followUpAt: when.toISOString(),
          followUpMessage: message.trim(),
        }),
      });
      if (res.everMessaged) {
        toast.success("Added to follow-up");
      } else {
        toast.warning("Added to follow-up", {
          description:
            "This number has never messaged you. Messaging people who did not write first raises the risk of WhatsApp restricting your number.",
        });
      }
      onAdded(res.item);
      onClose();
    } catch (err) {
      toast.error("Could not add", { description: errMessage(err, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  const chatsLoading = source === "chats" && chats?.deviceId !== deviceId;
  const contactsLoading = Boolean(groupId) && contacts?.groupId !== groupId;

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add to follow-up</DialogTitle>
          <DialogDescription>
            Put any number into follow-up with your own date and message. The AI will not change
            a plan you set yourself.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="afu-device">Send from</Label>
            {devices === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Connect a WhatsApp number under Devices first.
              </p>
            ) : (
              <select
                id="afu-device"
                className={selectClass}
                value={deviceId}
                onChange={(e) => chooseDevice(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.phone ? ` · ${d.phone}` : ""}
                    {d.status === "connected" ? "" : " (not connected)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Who</Label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant={source === s.id ? "default" : "outline"}
                  onClick={() => chooseSource(s.id)}
                >
                  {s.label}
                </Button>
              ))}
            </div>

            {source === "chats" ? (
              <PersonPicker
                people={chats?.deviceId === deviceId ? chats.people : []}
                loading={chatsLoading}
                emptyText="No chats on this number yet."
                onPick={pick}
              />
            ) : null}

            {source === "contacts" ? (
              groups === null ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : groups.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">You have no contact groups yet.</p>
              ) : (
                <div className="space-y-2">
                  <select
                    aria-label="Contact group"
                    className={selectClass}
                    value={groupId}
                    onChange={(e) => void loadContacts(e.target.value)}
                  >
                    <option value="">Choose a group…</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.stats.total})
                      </option>
                    ))}
                  </select>
                  {groupId ? (
                    <PersonPicker
                      key={groupId}
                      people={contacts?.groupId === groupId ? contacts.people : []}
                      loading={contactsLoading}
                      emptyText="This group has no contacts."
                      onPick={pick}
                    />
                  ) : null}
                </div>
              )
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="afu-phone" className="text-xs">WhatsApp number</Label>
                <Input
                  id="afu-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801XXXXXXXXX"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="afu-name" className="text-xs">Name (optional)</Label>
                <Input id="afu-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Include the country code, for example +880.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="afu-date">When</Label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.days}
                  type="button"
                  size="sm"
                  variant={date === presetValue(p.days) ? "secondary" : "outline"}
                  onClick={() => setDate(presetValue(p.days))}
                >
                  {p.label}
                </Button>
              ))}
              <Input
                id="afu-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-auto text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="afu-message">Message</Label>
            <Textarea
              id="afu-message"
              rows={4}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should be sent on that day"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="afu-note">Note for yourself (optional)</Label>
            <Input
              id="afu-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Example: asked about the Business plan"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Add to follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
