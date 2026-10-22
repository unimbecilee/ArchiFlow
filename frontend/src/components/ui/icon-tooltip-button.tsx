"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconTooltipButtonProps = ButtonProps & {
  label: string;
};

export const IconTooltipButton = React.forwardRef<
  HTMLButtonElement,
  IconTooltipButtonProps
>(({ label, className, children, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    size="icon"
    title={label}
    aria-label={label}
    className={cn("h-9 w-9 shrink-0", className)}
    {...props}
  >
    {children}
  </Button>
));
IconTooltipButton.displayName = "IconTooltipButton";
