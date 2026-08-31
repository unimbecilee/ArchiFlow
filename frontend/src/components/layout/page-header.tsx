import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  hideTitle?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
  className,
  hideTitle = false,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {!hideTitle && eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        )}
        {!hideTitle && (
          <div className="flex flex-wrap items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
            {badge}
          </div>
        )}
        {hideTitle && badge && <div className="flex flex-wrap gap-2">{badge}</div>}
        {description && <p className="max-w-[65ch] text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
