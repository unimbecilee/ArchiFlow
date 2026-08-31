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
          toast: "rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 font-sans",
          title: "text-sm font-semibold text-zinc-900",
          description: "text-sm text-zinc-500",
          actionButton:
            "rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500",
          cancelButton: "rounded-lg bg-zinc-100 text-zinc-700 text-xs",
          closeButton: "border-zinc-200 bg-white text-zinc-500",
        },
      }}
    />
  );
}
