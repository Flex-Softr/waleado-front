"use client";

import * as React from "react";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  QuickFillOptions,
  Rounding,
} from "@/features/admin/pricing/pricing-draft";

export function QuickFillCard({
  onApply,
}: {
  onApply: (opts: QuickFillOptions) => void;
}) {
  const [d3, setD3] = React.useState("10");
  const [d6, setD6] = React.useState("15");
  const [d12, setD12] = React.useState("25");
  const [mult, setMult] = React.useState("2.2");
  const [rounding, setRounding] = React.useState<Rounding>("90");
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-5" />
          Quick fill from monthly price
        </CardTitle>
        <CardDescription>
          Set each plan&apos;s monthly price below, then fill the longer cycles
          with a discount in one click. Review and save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          {(
            [
              ["3 months off %", d3, setD3],
              ["6 months off %", d6, setD6],
              ["Yearly off %", d12, setD12],
              ["Lifetime = yearly ×", mult, setMult],
            ] as const
          ).map(([label, value, set]) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                className="w-28"
                inputMode="decimal"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Rounding</Label>
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={rounding}
              onChange={(e) => setRounding(e.target.value as Rounding)}
            >
              <option value="90">Ends with 90 (৳2,690)</option>
              <option value="10">Nearest 10</option>
              <option value="none">No rounding</option>
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              onApply({
                discounts: {
                  3: Number(d3) || 0,
                  6: Number(d6) || 0,
                  12: Number(d12) || 0,
                },
                lifetimeMultiplier: Number(mult) || 0,
                rounding,
              })
            }
          >
            <Wand2 className="size-4" />
            Fill prices
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
