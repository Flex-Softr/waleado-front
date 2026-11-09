"use client";

import * as React from "react";
import {
  ChevronDown,
  Circle,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SendHorizontal,
  Smile,
  Smartphone,
  Square,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { LiveChatNewThreadDialog } from "@/features/live-chat/components/live-chat-new-thread-dialog";
import { LiveChatRenameThreadDialog } from "@/features/live-chat/components/live-chat-rename-thread-dialog";
import { DeviceConnectionAlert } from "@/features/shared/components/device-connection-alert";
import { useContacts } from "@/features/contacts/contacts-provider";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import type {
  LiveChatMessageRowApi,
  LiveChatSendMessageResponse,
  LiveChatThreadApi,
  LiveChatThreadsListResponse,
  LiveChatMessagesListResponse,
} from "@/types/live-chat-api";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiFormJson, apiJson } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function deviceOptionLabel(d: DeviceApiRecord): string {
  const bits = [deviceName(d)];
  if (d.phone) bits.push(d.phone);
  const status = d.status === "connected" ? "Connected" : "QR ready";
  return `${bits.join(" · ")} · ${status}`;
}

function deviceName(d: DeviceApiRecord): string {
  const name = (d.name ?? "").trim();
  return name || "Unnamed device";
}

function normalizePhoneForLookup(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function deliveryLabel(
  s: LiveChatMessageRowApi["deliveryStatus"]
): string | null {
  if (!s) return null;
  switch (s) {
    case "sent":
      return "Sent";
    case "queued":
      return "Sending…";
    case "failed":
      return "Failed";
    case "simulated":
      return "Simulated";
    default:
      return s;
  }
}

export function LiveChatClient() {
  const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "❤️"];
  const { userId, workspaceId, routeKey } = useSessionIdentity();
  const { groups, contactsByGroup, ensureGroupContacts } = useContacts();
  const [devices, setDevices] = React.useState<DeviceApiRecord[]>([]);
  const [devicesLoading, setDevicesLoading] = React.useState(true);
  const [deviceId, setDeviceId] = React.useState("");

  const [threads, setThreads] = React.useState<LiveChatThreadApi[]>([]);
  const [threadsLoading, setThreadsLoading] = React.useState(false);
  const [threadsRefreshing, setThreadsRefreshing] = React.useState(false);

  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    null
  );
  const [messages, setMessages] = React.useState<LiveChatMessageRowApi[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [messagesCursor, setMessagesCursor] = React.useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = React.useState(false);

  const [listQuery, setListQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [attachmentAssetId, setAttachmentAssetId] = React.useState("");
  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentMimeType, setAttachmentMimeType] = React.useState("");
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = React.useState("");
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [voiceReady, setVoiceReady] = React.useState(false);

  const [newThreadOpen, setNewThreadOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recorderStreamRef = React.useRef<MediaStream | null>(null);
  const recordedChunksRef = React.useRef<BlobPart[]>([]);
  const recordingIntervalRef = React.useRef<number | null>(null);
  const preserveScrollRef = React.useRef<number | null>(null);
  const pinnedToBottomRef = React.useRef(true);

  function stopRecordingTimer() {
    if (recordingIntervalRef.current != null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }

  function formatRecordingTime(totalSec: number): string {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function clearAttachmentSelection() {
    setAttachmentAssetId("");
    setAttachmentName("");
    setAttachmentMimeType("");
    setVoiceReady(false);
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    setAttachmentPreviewUrl("");
  }

  const loadDevices = React.useCallback(async () => {
    setDevicesLoading(true);
    try {
      const data = await apiJson<DevicesListResponse>("/v1/devices");
      setDevices(data.devices);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load devices.";
      toast.error("Load failed", { description: msg });
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setDeviceId("");
    setThreads([]);
    setMessages([]);
    setMessagesCursor(null);
    setSelectedThreadId(null);
  }, [userId, workspaceId, routeKey]);

  React.useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

  React.useEffect(() => {
    void loadDevices();
  }, [loadDevices, userId, workspaceId, routeKey]);

  const connectedDevices = React.useMemo(
    () => devices.filter((d) => d.status === "connected"),
    [devices]
  );
  const hasConnectedDevice = connectedDevices.length > 0;

  React.useEffect(() => {
    if (deviceId) {
      if (!devices.some((d) => d.id === deviceId)) {
        setDeviceId(connectedDevices[0]?.id ?? devices[0]?.id ?? "");
      }
      return;
    }
    if (connectedDevices.length > 0) {
      setDeviceId(connectedDevices[0].id);
    } else if (devices.length > 0) {
      setDeviceId(devices[0].id);
    }
  }, [devices, deviceId, connectedDevices]);

  const selectedDevice = React.useMemo(
    () => devices.find((d) => d.id === deviceId),
    [devices, deviceId]
  );

  const loadThreads = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!deviceId) {
        setThreads([]);
        return;
      }
      const targetDev = devices.find((d) => d.id === deviceId);
      if (targetDev?.status !== "connected") {
        setThreads([]);
        return;
      }
      const silent = opts?.silent === true;
      if (silent) setThreadsRefreshing(true);
      else setThreadsLoading(true);
      try {
        const data = await apiJson<LiveChatThreadsListResponse>(
          `/v1/live-chat/threads?deviceId=${encodeURIComponent(deviceId)}`
        );
        setThreads(data.threads);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Could not load conversations.";
        if (!silent) {
          toast.error("Load failed", { description: msg });
        }
        setThreads([]);
      } finally {
        if (silent) setThreadsRefreshing(false);
        else setThreadsLoading(false);
      }
    },
    [deviceId, devices]
  );

  React.useEffect(() => {
    setSelectedThreadId(null);
    setMessages([]);
    setMessagesCursor(null);
    if (!deviceId) return;
    void loadThreads();
  }, [deviceId, loadThreads]);

  const loadMessages = React.useCallback(
    async (
      threadId: string,
      opts?: { silent?: boolean; reset?: boolean; older?: boolean }
    ) => {
      const silent = opts?.silent === true;
      const reset = opts?.reset === true;
      const older = opts?.older === true;
      if (!silent && !older) setMessagesLoading(true);
      if (older) setLoadingOlder(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", older ? "100" : "50");
        if (older && messagesCursor) params.set("cursor", messagesCursor);
        const data = await apiJson<LiveChatMessagesListResponse>(
          `/v1/live-chat/threads/${encodeURIComponent(threadId)}/messages?${params.toString()}`
        );
        if (older) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else if (reset) {
          setMessages(data.messages);
        } else {
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const onlyNew = data.messages.filter((m) => !known.has(m.id));
            return onlyNew.length > 0 ? [...prev, ...onlyNew] : prev;
          });
        }
        if (reset || older) {
          setMessagesCursor(data.nextCursor);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Could not load messages.";
        if (!silent) {
          toast.error("Load failed", { description: msg });
        }
      } finally {
        if (!silent) setMessagesLoading(false);
        if (older) setLoadingOlder(false);
      }
    },
    [messagesCursor]
  );

  React.useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      setMessagesCursor(null);
      return;
    }
    void loadMessages(selectedThreadId, { reset: true });
  }, [selectedThreadId]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadMessages(selectedThreadId, { silent: true });
      void loadThreads({ silent: true });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selectedThreadId, loadMessages, loadThreads]);

  React.useEffect(() => {
    if (preserveScrollRef.current != null && messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      const previousHeight = preserveScrollRef.current;
      const delta = el.scrollHeight - previousHeight;
      el.scrollTop += delta;
      preserveScrollRef.current = null;
      return;
    }
    if (!pinnedToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedThreadId]);

  const selectedThread = React.useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  React.useEffect(() => {
    if (groups.length === 0) return;
    void Promise.all(
      groups
        .filter((g) => !contactsByGroup[g.id])
        .map((g) => ensureGroupContacts(g.id).catch(() => undefined))
    );
  }, [groups, contactsByGroup, ensureGroupContacts]);

  const savedContactNameByPhone = React.useMemo(() => {
    const byPhone = new Map<string, string>();
    for (const groupId of Object.keys(contactsByGroup)) {
      for (const contact of contactsByGroup[groupId] ?? []) {
        const normalized = normalizePhoneForLookup(contact.phone);
        const name = contact.name.trim();
        if (!normalized || !name || byPhone.has(normalized)) continue;
        byPhone.set(normalized, name);
      }
    }
    return byPhone;
  }, [contactsByGroup]);

  const threadTitleById = React.useMemo(() => {
    return new Map(
      threads.map((thread) => {
        const normalizedPeer = normalizePhoneForLookup(thread.peerPhone);
        let title = thread.displayTitle;
        if (normalizedPeer && savedContactNameByPhone.size > 0) {
          const direct = savedContactNameByPhone.get(normalizedPeer);
          if (direct) {
            title = direct;
          } else {
            let longestMatchName = "";
            let longestMatchPhoneLen = -1;
            for (const [savedPhone, savedName] of savedContactNameByPhone) {
              if (
                normalizedPeer.endsWith(savedPhone) ||
                savedPhone.endsWith(normalizedPeer)
              ) {
                if (savedPhone.length > longestMatchPhoneLen) {
                  longestMatchPhoneLen = savedPhone.length;
                  longestMatchName = savedName;
                }
              }
            }
            if (longestMatchName) {
              title = longestMatchName;
            }
          }
        }
        return [thread.id, title] as const;
      })
    );
  }, [threads, savedContactNameByPhone]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    if (threads.some((t) => t.id === selectedThreadId)) return;
    setSelectedThreadId(null);
  }, [threads, selectedThreadId]);

  const filteredThreads = React.useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        (threadTitleById.get(t.id) ?? t.displayTitle).toLowerCase().includes(q) ||
        t.peerPhone.toLowerCase().includes(q) ||
        t.lastPreview.toLowerCase().includes(q)
    );
  }, [threads, listQuery, threadTitleById]);

  const canSend =
    selectedThread != null &&
    selectedDevice?.status === "connected" &&
    (draft.trim().length > 0 || attachmentAssetId !== "") &&
    !sending;

  async function uploadAttachmentFile(file: File) {
    if (!file) return;
    clearAttachmentSelection();
    setAttachmentMimeType(file.type || "");
    if (
      file.type.startsWith("image/") ||
      file.type.startsWith("audio/") ||
      file.type.startsWith("video/")
    ) {
      setAttachmentPreviewUrl(URL.createObjectURL(file));
    }
    setAttachmentUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const meta = await apiFormJson<{ id: string; originalName: string }>(
        "/v1/templates/media",
        form
      );
      setAttachmentAssetId(meta.id);
      setAttachmentName(meta.originalName);
      toast.success("Attachment ready", { description: meta.originalName });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed.";
      toast.error("Upload failed", { description: msg });
      clearAttachmentSelection();
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function handleAttachmentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAttachmentFile(file);
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];
      const selectedMimeType = preferredMimeTypes.find((m) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      );
      const rec = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      setRecordingSeconds(0);
      setVoiceReady(false);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stopRecordingTimer();
        setRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: rec.mimeType });
        if (blob.size === 0) return;
        const runtimeMime = rec.mimeType || selectedMimeType || "audio/ogg;codecs=opus";
        const ext = runtimeMime.includes("ogg")
          ? "ogg"
          : runtimeMime.includes("webm")
            ? "webm"
            : "m4a";
        const file = new File([blob], `voice-note.${ext}`, {
          type: runtimeMime,
        });
        await uploadAttachmentFile(file);
        setVoiceReady(true);
      };
      recorderRef.current = rec;
      recorderStreamRef.current = stream;
      rec.start();
      setRecording(true);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      toast.message("Recording voice note…", {
        description: "Tap stop to attach it.",
      });
    } catch {
      toast.error("Microphone access denied", {
        description: "Allow microphone permission to send voice notes.",
      });
    }
  }

  function stopVoiceRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.stop();
    recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    recorderStreamRef.current = null;
  }

  function discardVoice() {
    if (recording) {
      recorderRef.current?.stop();
      recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      recorderStreamRef.current = null;
      setRecording(false);
    }
    stopRecordingTimer();
    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    clearAttachmentSelection();
  }

  async function handleSend() {
    if (!canSend || !selectedThread) return;
    const text = draft.trim();
    setSending(true);
    try {
      const res = await apiJson<LiveChatSendMessageResponse>(
        `/v1/live-chat/threads/${encodeURIComponent(selectedThread.id)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bodyText: text || undefined,
            mediaAssetId: attachmentAssetId || undefined,
          }),
        }
      );
      setDraft("");
      clearAttachmentSelection();
      setMessages((prev) => [...prev, res.message]);
      if (res.outbound.note) {
        toast.message("Message status", { description: res.outbound.note });
      }
      void loadThreads({ silent: true });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not send message.";
      toast.error("Send failed", { description: msg });
    } finally {
      setSending(false);
    }
  }

  function onThreadCreated(thread: LiveChatThreadApi) {
    setThreads((prev) => {
      const rest = prev.filter((t) => t.id !== thread.id);
      return [thread, ...rest];
    });
    setSelectedThreadId(thread.id);
  }

  function onThreadRenamed(thread: LiveChatThreadApi) {
    setThreads((prev) =>
      prev.map((t) => (t.id === thread.id ? thread : t))
    );
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function appendEmoji(emoji: string) {
    setDraft((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
  }

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
    pinnedToBottomRef.current = nearBottom;
    setShowJumpToBottom(!nearBottom && messages.length > 0);
    if (
      el.scrollTop <= 30 &&
      messagesCursor &&
      !loadingOlder &&
      selectedThreadId &&
      !messagesLoading
    ) {
      preserveScrollRef.current = el.scrollHeight;
      void loadMessages(selectedThreadId, { older: true });
    }
  }

  function jumpToBottom() {
    pinnedToBottomRef.current = true;
    setShowJumpToBottom(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const sessionConnected = selectedDevice?.status === "connected";

  return (
    <div className="space-y-4">
      {!sessionConnected && !devicesLoading ? (
        <DeviceConnectionAlert
          title="No WhatsApp Device Connected"
          description="Live Chat requires an active, connected WhatsApp device to send and receive real-time messages. Please connect a device under Devices to start chatting."
          actionText="Connect Device"
          actionHref="/devices"
        />
      ) : null}

      <div
        className={cn(
          "flex h-[min(720px,calc(100vh-11rem))] flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm",
          "dark:border-slate-800 dark:bg-slate-950"
        )}
      >
        <div className="flex flex-col gap-3 border-b border-border bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-muted dark:text-foreground">
                <Smartphone className="size-4" />
              </div>
              <span className="whitespace-nowrap text-sm font-semibold">Live Chat</span>
            </div>
            {devicesLoading ? (
              <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading sessions...
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a device under Devices to use live chat.
              </p>
            ) : (
              <Select
                value={deviceId}
                onValueChange={(v) => setDeviceId(v ?? "")}
                items={devices.map((d) => ({
                  value: d.id,
                  label: deviceOptionLabel(d),
                }))}
              >
                <SelectTrigger className="h-10 w-full rounded-md sm:w-[min(100%,320px)]">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {deviceOptionLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-md"
              disabled={!sessionConnected || !deviceId || threadsLoading || threadsRefreshing}
              onClick={() => void loadThreads({ silent: true })}
            >
              <RefreshCw
                className={`size-4 ${threadsRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                sessionConnected
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.35)]",
                  sessionConnected ? "bg-emerald-500" : "bg-amber-500"
                )}
                aria-hidden
              />
              {sessionConnected ? "Session connected" : "Session not connected"}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-slate-200/90 lg:w-[320px] lg:border-r lg:border-b-0 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Chats
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-md text-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-muted/50"
                disabled={!sessionConnected || !deviceId || devices.length === 0}
                onClick={() => setNewThreadOpen(true)}
                aria-label="New chat"
              >
              <Plus className="size-5" />
            </Button>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-10 rounded-md pl-10"
                disabled={threads.length === 0 && !threadsLoading}
                aria-label="Search conversations"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
            {!deviceId || devices.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a WhatsApp session to see conversations.
              </p>
            ) : threadsLoading ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-foreground" />
                Loading conversations...
              </div>
            ) : filteredThreads.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {threads.length === 0
                  ? "No conversations yet. Use + to start one, or send a single message to create history."
                  : "No matches for your search."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {filteredThreads.map((t) => {
                  const active = t.id === selectedThreadId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedThreadId(t.id)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-muted ring-1 ring-border dark:bg-muted/30 dark:ring-border"
                            : "hover:bg-slate-100/90 dark:hover:bg-slate-900/60"
                        )}
                      >
                        <p className="truncate font-medium text-foreground">
                          {threadTitleById.get(t.id) ?? t.displayTitle}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {t.lastPreview || "No messages yet"}
                        </p>
                        {t.lastMessageAt ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatMessageTime(t.lastMessageAt)}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex h-full min-h-[280px] min-w-0 flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/25">
          {!selectedThread ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"
              aria-live="polite"
            >
              <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border dark:bg-muted/50 dark:text-foreground dark:ring-border">
                <MessageCircle className="size-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Select a conversation
                </p>
                <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Choose a chat from the sidebar or start a new one with +.
                </p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {threadTitleById.get(selectedThread.id) ?? selectedThread.displayTitle}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedThread.peerPhone}
                    {selectedThread.deviceName
                      ? ` · ${selectedThread.deviceName}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-md"
                  onClick={() => setRenameOpen(true)}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </Button>
              </header>

              <div
                ref={messagesContainerRef}
                className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4"
                onScroll={onMessagesScroll}
              >
                {messagesLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No messages in this thread yet.
                  </p>
                ) : (
                  <div className="mx-auto flex max-w-2xl flex-col gap-3">
                    {messagesCursor || loadingOlder ? (
                      <div className="flex justify-center">
                        <p className="text-xs text-muted-foreground">
                          {loadingOlder ? "Loading older messages..." : "Scroll up for older messages"}
                        </p>
                      </div>
                    ) : null}
                    {messages.map((m) => {
                      const outbound = m.direction === "outbound";
                      const statusLine = deliveryLabel(m.deliveryStatus);
                      const mediaPath =
                        m.mediaUrl ??
                        (m.assetId ? `/v1/templates/media/${m.assetId}` : undefined);
                      const mediaUrl = mediaPath
                        ? mediaPath.startsWith("http")
                          ? mediaPath
                          : `${getApiBaseUrl()}${mediaPath}`
                        : undefined;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex w-full",
                            outbound ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm",
                              outbound
                                ? "bg-primary text-white"
                                : "border border-slate-200/90 bg-white text-foreground dark:border-slate-700 dark:bg-slate-950"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {m.bodyText}
                            </p>
                            {m.kind === "image" && mediaUrl ? (
                              <a href={mediaUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={mediaUrl}
                                  alt={m.fileName ?? "Image"}
                                  className="mt-2 max-h-64 w-auto rounded-lg border border-slate-200/80 object-contain dark:border-slate-700"
                                />
                              </a>
                            ) : null}
                            {m.kind === "video" && mediaUrl ? (
                              <video
                                className="mt-2 max-h-72 w-full rounded-lg border border-slate-200/80 dark:border-slate-700"
                                src={mediaUrl}
                                controls
                              />
                            ) : null}
                            {m.kind === "audio" && mediaUrl ? (
                              <audio className="mt-2 w-full" src={mediaUrl} controls />
                            ) : null}
                            {m.kind === "document" && mediaUrl ? (
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                  outbound
                                    ? "border-border/60 text-white/95"
                                    : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                                )}
                              >
                                <FileText className="size-4" />
                                {m.fileName ?? "Open document"}
                              </a>
                            ) : null}
                            {m.kind === "sticker" && mediaUrl ? (
                              <img
                                src={mediaUrl}
                                alt="Sticker"
                                className="mt-2 max-h-44 w-auto rounded-lg object-contain"
                              />
                            ) : null}
                            {m.kind === "location" ? (
                              <div
                                className={cn(
                                  "mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                                  outbound
                                    ? "bg-white/15 text-white"
                                    : "bg-muted text-foreground"
                                )}
                              >
                                <MapPin className="size-3.5 text-rose-500" />
                                <span>Shared Location</span>
                              </div>
                            ) : null}
                            {m.kind === "contact" ? (
                              <div
                                className={cn(
                                  "mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                                  outbound
                                    ? "bg-white/15 text-white"
                                    : "bg-muted text-foreground"
                                )}
                              >
                                <UserCheck className="size-3.5 text-primary" />
                                <span>Shared Contact</span>
                              </div>
                            ) : null}
                            <div
                              className={cn(
                                "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]",
                                outbound
                                  ? "text-primary-foreground/90"
                                  : "text-muted-foreground"
                              )}
                            >
                              <span>{formatMessageTime(m.createdAt)}</span>
                              {outbound && statusLine ? (
                                <span className="opacity-90">· {statusLine}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
                  </div>
                )}
                {showJumpToBottom ? (
                  <div className="pointer-events-none sticky bottom-3 z-10 mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="pointer-events-auto h-9 rounded-md bg-primary px-3 text-white shadow-md hover:bg-primary/90"
                      onClick={jumpToBottom}
                    >
                      <ChevronDown className="mr-1 size-4" />
                      Latest
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200/90 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mx-auto flex max-w-2xl flex-col gap-2">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    disabled={!sessionConnected}
                    onChange={handleAttachmentFile}
                  />
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder={
                      !sessionConnected
                        ? "Connect this WhatsApp session under Devices to send messages..."
                        : "Type a message..."
                    }
                    rows={2}
                    className="min-h-[44px] w-full resize-none rounded-md text-[15px]"
                    disabled={!sessionConnected || sending}
                    aria-label="Message text"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 rounded-md px-3"
                      disabled={!sessionConnected || sending}
                      onClick={() => setEmojiOpen((v) => !v)}
                    >
                      <Smile className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 rounded-md"
                      disabled={!sessionConnected || sending || attachmentUploading}
                      onClick={() => attachmentInputRef.current?.click()}
                    >
                      {attachmentUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Paperclip className="size-4" />
                      )}
                      {attachmentAssetId ? "Replace file" : "Attach"}
                    </Button>
                    <Button
                      type="button"
                      variant={recording ? "destructive" : "outline"}
                      className="h-10 shrink-0 rounded-md"
                      disabled={!sessionConnected || sending || attachmentUploading}
                      onClick={() =>
                        recording ? stopVoiceRecording() : void startVoiceRecording()
                      }
                    >
                      {recording ? (
                        <>
                          <Square className="size-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="size-4" />
                          Voice
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="h-10 shrink-0 rounded-md bg-primary px-5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                      disabled={!sessionConnected || !canSend}
                      onClick={() => void handleSend()}
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="size-4" />
                      )}
                      Send
                    </Button>
                  </div>
                  {attachmentAssetId ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                      {attachmentMimeType.startsWith("image/") && attachmentPreviewUrl ? (
                        <img
                          src={attachmentPreviewUrl}
                          alt={attachmentName || "Attachment preview"}
                          className="max-h-44 w-auto rounded-lg object-contain"
                        />
                      ) : attachmentMimeType.startsWith("video/") && attachmentPreviewUrl ? (
                        <video
                          className="max-h-48 w-full rounded-lg bg-black/10 object-contain"
                          src={attachmentPreviewUrl}
                          controls
                        />
                      ) : attachmentMimeType.startsWith("audio/") &&
                        attachmentPreviewUrl ? (
                        <audio className="w-full" src={attachmentPreviewUrl} controls />
                      ) : !attachmentMimeType.startsWith("image/") &&
                        !attachmentMimeType.startsWith("audio/") &&
                        !attachmentMimeType.startsWith("video/") &&
                        attachmentName ? (
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
                          <FileText className="size-5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {attachmentName}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {attachmentMimeType || "Document"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        {voiceReady ? (
                          <Mic className="inline size-3.5 text-rose-500" />
                        ) : attachmentMimeType.startsWith("video/") ? (
                          <Film className="inline size-3.5 text-indigo-500" />
                        ) : attachmentMimeType.startsWith("image/") ? (
                          <ImageIcon className="inline size-3.5 text-emerald-500" />
                        ) : (
                          <FileText className="inline size-3.5 text-sky-500" />
                        )}
                        <span className="truncate font-medium">{attachmentName}</span>
                        <button
                          type="button"
                          className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          onClick={discardVoice}
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                {recording ? (
                  <div className="mx-auto mt-2 flex max-w-2xl items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                    <Circle className="size-3 fill-current" />
                    Recording voice note
                    <span className="font-mono">{formatRecordingTime(recordingSeconds)}</span>
                    <button
                      type="button"
                      className="ml-auto rounded px-1.5 py-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                      onClick={discardVoice}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
                {emojiOpen ? (
                  <div className="mx-auto mt-2 flex max-w-2xl flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded-md px-2 py-1 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => appendEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      <LiveChatNewThreadDialog
        open={newThreadOpen}
        onOpenChange={setNewThreadOpen}
        deviceId={deviceId}
        onCreated={onThreadCreated}
      />
      <LiveChatRenameThreadDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        thread={selectedThread}
        onSaved={onThreadRenamed}
      />
    </div>
    </div>
  );
}
