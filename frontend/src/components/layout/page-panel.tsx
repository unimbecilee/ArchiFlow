import { cn } from "@/lib/utils";

type PagePanelProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  delay?: number;
};

export function PagePanel({
  title,
  subtitle,
  children,
  className,
  compact = false,
}: PagePanelProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {(title || subtitle) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          {title && <h2 className="text-[13px] font-semibold tracking-tight text-zinc-900">{title}</h2>}
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
      )}
      <div className={cn("surface-card", compact ? "p-4" : "p-5 sm:p-6")}>{children}</div>
    </section>
  );
}
