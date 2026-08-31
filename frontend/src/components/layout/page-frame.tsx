"use client";

import { FadeUp } from "@/components/motion/fade-up";
import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return <FadeUp className={cn("mx-auto max-w-6xl space-y-6", className)}>{children}</FadeUp>;
}
