"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminBillingReport } from "@/features/admin/lib/admin-billing-api";
import { formatBdt } from "@/types/billing";

const BAR_COLOR = "#059669";
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
}

function compactBdt(n: number): string {
  if (n >= 100_000) return `৳${Math.round(n / 1000)}k`;
  if (n >= 1000) return `৳${(n / 1000).toFixed(1)}k`;
  return `৳${n}`;
}

/** Money collected per month over the last 12 months (single series). */
export function RevenueChart({ data }: { data: AdminBillingReport["revenueByMonth"] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" className="stroke-border" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
        <YAxis axisLine={false} tickLine={false} tick={axisTick} width={52} tickFormatter={compactBdt} />
        <Tooltip
          cursor={{ fill: "rgba(5, 150, 105, 0.08)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
          formatter={(value, _name, item) => [
            `${formatBdt(Number(value))} · ${(item.payload as { invoices: number }).invoices} invoices`,
            "Collected",
          ]}
        />
        <Bar dataKey="cash" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
