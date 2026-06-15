"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-slate-200/80 bg-white shadow-lg font-sans",
          title: "text-sm font-semibold text-zinc-900",
          description: "text-sm text-zinc-600",
          actionButton:
            "rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700",
          cancelButton: "rounded-lg bg-zinc-100 text-zinc-700 text-xs",
          closeButton: "border-slate-200 bg-white text-zinc-500",
        },
      }}
    />
  );
}
