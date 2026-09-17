"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DashboardBarPoint,
  DashboardLinePoint,
} from "@/types/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "0 12px 40px -12px rgba(91, 33, 182, 0.2)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
};

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

type DashboardChartsProps = {
  barSeries: DashboardBarPoint[];
  lineSeries: DashboardLinePoint[];
};

export function DashboardCharts({ barSeries, lineSeries }: DashboardChartsProps) {
  const [range, setRange] = React.useState("6");

  const barData = React.useMemo(() => {
    const n = range === "3" ? 3 : range === "12" ? 12 : 6;
    return barSeries.slice(-n);
  }, [barSeries, range]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border">
        <CardHeader className="flex flex-col gap-2 space-y-0 px-5 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-card-foreground">
              Message volume
            </CardTitle>
            <CardDescription className="text-xs">
              Outbound WhatsApp traffic
            </CardDescription>
          </div>
          <Select
            value={range}
            onValueChange={(v) => setRange(v ?? "6")}
            items={[
              { value: "3", label: "3 months" },
              { value: "6", label: "6 months" },
              { value: "12", label: "12 months" },
            ]}
          >
            <SelectTrigger className="h-8 w-[124px] rounded-lg border border-border/60 bg-muted/50 text-xs text-foreground">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-[250px] px-5 pb-5 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={axisTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={axisTick}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "rgba(139, 92, 246, 0.07)" }}
                contentStyle={tooltipStyle}
              />
              <Bar
                dataKey="value"
                name="Messages"
                fill="url(#barViolet)"
                radius={[10, 10, 4, 4]}
                maxBarSize={52}
              />
              <defs>
                <linearGradient id="barViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.45} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border">
        <CardHeader className="space-y-0.5 px-5 pb-2 pt-5">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Channel mix
          </CardTitle>
          <CardDescription className="text-xs">
            Campaign, direct text, template, live chat (daily)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] px-5 pb-5 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineSeries}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                className="stroke-border"
              />
              <XAxis
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={axisTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={axisTick}
                width={36}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="s1"
                name="Campaign"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="s2"
                name="Text"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="s3"
                name="Template"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="s4"
                name="Live chat"
                stroke="#eab308"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
