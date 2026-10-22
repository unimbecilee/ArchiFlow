"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg border border-border bg-popover text-popover-foreground shadow-pop font-sans",
          title: "text-sm font-semibold text-foreground",
          description: "text-sm text-muted-foreground",
          actionButton:
            "bg-primary text-primary-foreground rounded-md text-xs font-medium",
          cancelButton: "bg-muted text-muted-foreground rounded-md text-xs",
          closeButton: "border-border bg-card text-muted-foreground",
        },
      }}
    />
  );
}
