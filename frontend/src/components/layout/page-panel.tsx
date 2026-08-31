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
    <section className={cn("space-y-2", className)}>
      {(title || subtitle) && (
        <div className="px-1">
          {title && <p className="text-sm font-semibold tracking-tight">{title}</p>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className={cn("surface-card", compact ? "p-4" : "p-6")}>{children}</div>
    </section>
  );
}
