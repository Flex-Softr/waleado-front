import type { LucideIcon } from "lucide-react";

/** Title block used at the top of admin pages, with optional controls on the right. */
export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div> : null}
    </div>
  );
}
