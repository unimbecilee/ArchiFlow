import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white/88 px-5 py-4 shadow-sm backdrop-blur-[6px] dark:border-zinc-800 dark:bg-zinc-900/85 sm:px-6 sm:py-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {icon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 dark:bg-emerald-600">
                {icon}
              </span>
            )}
            <h1 className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-[24px]">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 max-w-[62ch] text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
