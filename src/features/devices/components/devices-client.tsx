"use client";

import * as React from "react";
import { CheckCircle2, Clock3, Loader2, Plus, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";

import type {
  DeviceApiRecord,
  DeviceLinkStateResponse,
  DevicesListResponse,
  WhatsAppDevice,
} from "@/types/device";
import { AddDeviceDialog } from "@/features/devices/components/add-device-dialog";
import { DeviceCard } from "@/features/devices/components/device-card";
import { DeviceConnectedDialog } from "@/features/devices/components/device-connected-dialog";
import { ScanQrDialog } from "@/features/devices/components/scan-qr-dialog";
import { deviceFromApi } from "@/features/devices/lib/device-utils";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { useSessionIdentity } from "@/hooks/use-session-identity";
import { ApiError, apiFetch, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function throwIfBad(res: Response): Promise<void> {
  if (res.ok || res.status === 204) return;
  let message = res.statusText;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    message = body.error?.message ?? message;
  } catch {
    /* ignore */
  }
  throw new ApiError(res.status, message);
}

export function DevicesClient() {
  const { userId, workspaceId, routeKey } = useSessionIdentity();
  const [devices, setDevices] = React.useState<WhatsAppDevice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [activeDevice, setActiveDevice] = React.useState<WhatsAppDevice | null>(
    null
  );
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [linkSnapshot, setLinkSnapshot] =
    React.useState<DeviceLinkStateResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<WhatsAppDevice | null>(
    null
  );
  const [disconnectTarget, setDisconnectTarget] =
    React.useState<WhatsAppDevice | null>(null);

  const totalDevices = devices.length;
  const connectedDevices = devices.filter((d) => d.status === "connected").length;
  const qrReadyDevices = devices.filter((d) => d.status === "qr_ready").length;

  const loadDevices = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<DevicesListResponse>("/v1/devices");
      setDevices(data.devices.map(deviceFromApi));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load devices.";
      toast.error("Failed to load devices", { description: msg });
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDevices();
  }, [loadDevices, userId, workspaceId, routeKey]);

  React.useEffect(() => {
    if (!qrOpen || !activeDevice) {
      setLinkSnapshot(null);
      return;
    }

    const deviceId = activeDevice.id;
    let cancelled = false;

    async function pollLink() {
      try {
        const s = await apiJson<DeviceLinkStateResponse>(
          `/v1/devices/${encodeURIComponent(deviceId)}/link`
        );
        if (cancelled) return;
        setLinkSnapshot(s);
        if (s.status === "connected") {
          setQrOpen(false);
          setActiveDevice(null);
          setSuccessOpen(true);
          await loadDevices();
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError ? err.message : "Could not load link state.";
        toast.error("Link status failed", { description: msg });
      }
    }

    void pollLink();
    const interval = setInterval(() => {
      void pollLink();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [qrOpen, activeDevice, loadDevices]);

  async function handleCreate(name: string) {
    try {
      const created = await apiJson<DeviceApiRecord>("/v1/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setDevices((prev) => [deviceFromApi(created), ...prev]);
      toast.success("Device created", {
        description: "Open “Show QR Code” to link WhatsApp with your phone.",
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create device.";
      toast.error("Create failed", { description: msg });
      throw err;
    }
  }

  function handleShowQr(device: WhatsAppDevice) {
    setActiveDevice(device);
    setQrOpen(true);
  }

  function handlePairingCode(device?: WhatsAppDevice) {
    toast.message("Pairing code", {
      description: `Phone-number pairing for "${device?.name ?? "device"}" — add a pairing-code endpoint or WhatsApp Cloud API flow when your provider is ready.`,
    });
  }

  async function handleDemoConnected() {
    if (!activeDevice) {
      throw new Error("No device selected");
    }
    setPendingId(activeDevice.id);
    try {
      const updated = await apiJson<DeviceApiRecord>(
        `/v1/devices/${encodeURIComponent(activeDevice.id)}/simulate-connect`,
        { method: "POST" }
      );
      const mapped = deviceFromApi(updated);
      setDevices((prev) => prev.map((d) => (d.id === mapped.id ? mapped : d)));
      setActiveDevice(mapped);
      setSuccessOpen(true);
      toast.success("Device connected (demo)", {
        description: "Session marked connected on the server.",
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Simulation failed.";
      toast.error("Could not update device", { description: msg });
      throw err;
    } finally {
      setPendingId(null);
    }
  }

  async function handleSetDefault(device: WhatsAppDevice) {
    setPendingId(device.id);
    try {
      const updated = await apiJson<DeviceApiRecord>(
        `/v1/devices/${encodeURIComponent(device.id)}/set-default`,
        { method: "POST" }
      );
      const mapped = deviceFromApi(updated);
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id === mapped.id) return mapped;
          return d.isDefault ? { ...d, isDefault: false } : d;
        })
      );
      toast.success("Default device updated", {
        description: `${device.name} is now used for Open API sends.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not set default device.";
      toast.error("Set default failed", { description: msg });
      throw err;
    } finally {
      setPendingId(null);
    }
  }

  async function handleDisconnect(device: WhatsAppDevice) {
    setPendingId(device.id);
    try {
      const updated = await apiJson<DeviceApiRecord>(
        `/v1/devices/${encodeURIComponent(device.id)}/disconnect`,
        { method: "POST" }
      );
      const mapped = deviceFromApi(updated);
      setDevices((prev) => prev.map((d) => (d.id === mapped.id ? mapped : d)));
      toast.message("Disconnected", {
        description: `${device.name} is back to QR / pairing setup.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Disconnect failed.";
      toast.error("Disconnect failed", { description: msg });
      throw err;
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(device: WhatsAppDevice) {
    setPendingId(device.id);
    try {
      const res = await apiFetch(
        `/v1/devices/${encodeURIComponent(device.id)}`,
        { method: "DELETE" }
      );
      await throwIfBad(res);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      if (activeDevice?.id === device.id) {
        setActiveDevice(null);
        setQrOpen(false);
      }
      toast.message("Device removed", {
        description: `${device.name} was deleted.`,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed.";
      toast.error("Delete failed", { description: msg });
      throw err;
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-lg border border-border bg-white/85 px-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
        <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-muted/50 dark:text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <p className="text-sm font-medium">Loading WhatsApp devices...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-7">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-muted dark:text-foreground">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                WhatsApp Devices
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Connect, scan, disconnect, and manage all WhatsApp sessions.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:w-[270px]">
            <div className="rounded-lg bg-muted px-3 py-2 text-center text-foreground dark:bg-muted/40 dark:text-foreground">
              <p className="text-lg font-bold tabular-nums">{totalDevices}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
                Total
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="text-lg font-bold tabular-nums">{connectedDevices}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
                Online
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-center text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="text-lg font-bold tabular-nums">{qrReadyDevices}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
                QR
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-10 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary/90"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            New Device
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="size-4" />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
              Connected sessions
            </span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {connectedDevices} ready
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <Clock3 className="size-4" />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
              Waiting for scan
            </span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {qrReadyDevices} pending
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-14 justify-between rounded-lg border-border bg-white px-4 py-3 text-foreground shadow-sm hover:bg-muted dark:border-border dark:bg-slate-950 dark:text-foreground"
          onClick={() => {
            const nextReady = devices.find((d) => d.status === "qr_ready");
            if (nextReady) {
              handleShowQr(nextReady);
            } else {
              setAddOpen(true);
            }
          }}
        >
          <span className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground dark:bg-muted/40 dark:text-foreground">
              <QrCode className="size-4" />
            </span>
            <span className="font-semibold">
              {qrReadyDevices > 0 ? "Scan pending QR" : "Create QR session"}
            </span>
          </span>
          <span className="text-xs text-slate-400">Open</span>
        </Button>
      </div>

      <div>
        <div className="mb-3">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Device list
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep only active business numbers connected for reliable messaging.
          </p>
        </div>

        {devices.length === 0 ? (
          <Card className="rounded-lg border border-dashed border-border bg-white/95 shadow-sm dark:border-border dark:bg-slate-950/80">
            <CardHeader className="sr-only">
              <CardTitle>Connected devices</CardTitle>
              <CardDescription>List of WhatsApp sessions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-6 px-6 py-14 text-center sm:px-8 sm:py-16">
              <div className="flex size-[4.5rem] items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border dark:bg-muted/50 dark:text-foreground dark:ring-border">
                <QrCode className="size-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  No WhatsApp devices yet
                </h3>
                <p className="max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Create your first session, scan the QR from your phone, and
                  keep this number ready for campaigns and automation.
                </p>
              </div>
              <Button
                type="button"
                className="h-11 rounded-md bg-primary px-5 font-semibold text-white hover:bg-primary/90"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
                Add Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                busy={pendingId === device.id}
                onShowQr={handleShowQr}
                onPairingCode={handlePairingCode}
                onSetDefault={(d) => void handleSetDefault(d)}
                onDisconnect={(d) => setDisconnectTarget(d)}
                onDelete={(d) => setDeleteTarget(d)}
              />
            ))}
          </div>
        )}
      </div>

      <AddDeviceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={async (name) => {
          await handleCreate(name);
        }}
        onPairingInstead={() => handlePairingCode()}
      />

      <ScanQrDialog
        open={qrOpen}
        onOpenChange={(open) => {
          setQrOpen(open);
          if (!open) setActiveDevice(null);
        }}
        qrValue={linkSnapshot?.qr ?? ""}
        bridgeEnabled={linkSnapshot?.bridgeEnabled ?? true}
        waConnecting={
          linkSnapshot === null ||
          (linkSnapshot.bridgeEnabled &&
            linkSnapshot.status === "qr_ready" &&
            !linkSnapshot.qr &&
            !linkSnapshot.startError)
        }
        startError={linkSnapshot?.startError ?? null}
        onPairingInstead={() =>
          activeDevice && handlePairingCode(activeDevice)
        }
        onDemoConnected={() => handleDemoConnected()}
        demoBusy={pendingId === activeDevice?.id}
      />

      <DeviceConnectedDialog open={successOpen} onOpenChange={setSuccessOpen} />

      <ConfirmDestructiveDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this device?"
        description={
          <>
            Remove{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            and its WhatsApp session from Waleado. This cannot be undone.
          </>
        }
        confirmLabel="Delete device"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await handleDelete(deleteTarget);
        }}
      />

      <ConfirmDestructiveDialog
        destructive={false}
        open={disconnectTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDisconnectTarget(null);
        }}
        title="Disconnect WhatsApp?"
        description={
          <>
            <span className="font-semibold text-foreground">
              {disconnectTarget?.name}
            </span>{" "}
            will go back to QR / pairing. You can link again when you are ready.
          </>
        }
        confirmLabel="Disconnect"
        onConfirm={async () => {
          if (!disconnectTarget) return;
          await handleDisconnect(disconnectTarget);
        }}
      />
    </div>
  );
}
