import { cn } from "@/lib/utils";

/** Title row shared by every dashboard page: title, optional one-line subtitle, actions on the end side. */
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A card section with an optional heading row. */
export function Panel({ title, icon: Icon, actions, children, className, flush }: { title?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; actions?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-bold">
            {Icon && <Icon className="h-4.5 w-4.5 text-brand" aria-hidden="true" />}
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/** A key figure: icon, value, label and an optional hint under it. */
export function StatTile({ label, value, icon: Icon, tone, hint }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone: string; hint?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-xl font-extrabold tabular-nums sm:text-2xl" dir="ltr" style={{ textAlign: "start", unicodeBidi: "plaintext" }}>{value}</p>
      <p className="mt-0.5 text-xs text-muted sm:text-sm">{label}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      <span className="pointer-events-none absolute -end-8 -top-8 h-24 w-24 rounded-full bg-brand/5" aria-hidden="true" />
    </div>
  );
}
