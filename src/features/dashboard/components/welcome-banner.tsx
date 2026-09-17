"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import { userDisplayName } from "@/lib/user-display";

type WelcomeBannerProps = {
  devicesOnline: number;
  messagesToday: number;
};

export function WelcomeBanner({
  devicesOnline,
  messagesToday,
}: WelcomeBannerProps) {
  const { license, hydrated } = useSubscription();
  const { user } = useAuth();
  const tierLine = hydrated ? license.tierLabel : "…";
  const who = user ? userDisplayName(user) : "…";

  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-xl border border-emerald-900/30 bg-gradient-to-br from-slate-900 via-[#0b1c2d] to-[#043324] px-6 py-7 text-white shadow-md sm:px-8 sm:py-8">
      <div className="relative z-10 max-w-md space-y-4">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Manage your messaging in one touch
        </h2>
        <p className="max-w-sm text-sm font-medium leading-relaxed text-white/85">
          Your WhatsApp workspace, campaigns, contacts, and automation pulse in
          one calm control center.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs leading-relaxed text-white/90 sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <span
              className={
                devicesOnline > 0
                  ? "size-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]"
                  : "size-1.5 shrink-0 rounded-full bg-white/40"
              }
            />
            {devicesOnline} devices online
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.7)]" />
            {messagesToday} outbound today
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-white/50" />
            {tierLine} · {who}
          </span>
        </div>
        <Link
          href="/bulk-messages"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-foreground shadow-sm"
        >
          Open campaigns
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="pointer-events-none absolute right-4 top-1/2 hidden w-[42%] -translate-y-1/2 sm:block">
        <div className="relative ml-auto aspect-[1.25] max-w-[360px]">
          <div className="absolute inset-x-[16%] bottom-[7%] h-3 rounded-full bg-foreground/20" />
          <div className="absolute inset-x-[20%] bottom-[13%] h-[72%] rounded-lg border-[10px] border-white/55 bg-white/18 shadow-sm backdrop-blur-sm">
            <div className="absolute left-[12%] right-[10%] top-[46%] h-[3px] rotate-[-21deg] rounded-full bg-neutral-800/80" />
            <div className="absolute left-[24%] right-[5%] top-[38%] h-[3px] rotate-[-12deg] rounded-full bg-neutral-800/80" />
            <div className="absolute left-[18%] top-[28%] size-4 rounded-full border-4 border-yellow-300" />
            <div className="absolute right-[8%] top-[20%] size-7 rounded-full bg-neutral-400/70" />
          </div>
          <div className="absolute left-[10%] top-[20%] flex h-[72px] w-[120px] items-end justify-center gap-2 rounded-lg bg-cyan-400/90 px-5 pb-4 shadow-[0_18px_45px_rgba(30,100,190,0.25)]">
            {[34, 48, 66, 42, 58].map((height, index) => (
              <span
                key={index}
                className="w-2 rounded-full bg-white"
                style={{ height }}
              />
            ))}
          </div>
          <MessageCircle className="absolute right-[2%] top-[5%] size-14 text-white/16" />
        </div>
      </div>
    </div>
  );
}
