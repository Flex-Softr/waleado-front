import { Input } from "@/components/ui/input";
import {
  parseNumber,
  type PriceDraft,
} from "@/features/admin/pricing/pricing-draft";
import { cn } from "@/lib/utils";
import { formatBdt, LIFETIME_MONTHS } from "@/types/billing";

export function PriceCell({
  months,
  monthly,
  value,
  onChange,
}: {
  months: number;
  monthly: number | null;
  value: PriceDraft;
  onChange: (patch: Partial<PriceDraft>) => void;
}) {
  const amount = parseNumber(value.amountBdt);
  const perMonth =
    amount !== null && months > 1 ? Math.round(amount / months) : null;
  const saving =
    amount !== null && monthly && months > 1
      ? Math.round((1 - amount / (monthly * months)) * 100)
      : null;
  const isLifetime = months === LIFETIME_MONTHS;
  const capNum = parseNumber(value.saleCap);
  return (
    <td className={cn("border-b p-2", !value.isActive && "opacity-60")}>
      <div className="w-[170px] space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
          />
          Selling
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            className="pl-6 font-semibold"
            inputMode="decimal"
            placeholder="Price"
            value={value.amountBdt}
            onChange={(e) => onChange({ amountBdt: e.target.value })}
          />
        </div>
        <p className="h-4 text-[11px] text-muted-foreground">
          {perMonth ? `${formatBdt(perMonth)}/mo` : ""}
          {saving !== null && saving > 0 ? ` · ${saving}% off` : ""}
          {isLifetime && monthly && amount
            ? ` · ${(amount / (monthly * 12)).toFixed(1)}× yearly list`
            : ""}
        </p>
        <Input
          className="h-8 text-xs"
          inputMode="decimal"
          placeholder="Strike-through ৳"
          value={value.compareAtBdt}
          onChange={(e) => onChange({ compareAtBdt: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          placeholder="Badge (e.g. Save 25%)"
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          inputMode="decimal"
          placeholder="USD (optional)"
          value={value.amountUsd}
          onChange={(e) => onChange({ amountUsd: e.target.value })}
        />
        {isLifetime ? (
          <>
            <Input
              className="h-8 text-xs"
              inputMode="numeric"
              placeholder="Max sales (empty = no limit)"
              value={value.saleCap}
              onChange={(e) => onChange({ saleCap: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              type="date"
              title="Stop selling after this date"
              value={value.saleEndsAt}
              onChange={(e) => onChange({ saleEndsAt: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Sold {value.sold}
              {capNum !== null
                ? ` · ${Math.max(0, capNum - value.sold)} left`
                : ""}
            </p>
          </>
        ) : null}
      </div>
    </td>
  );
}
