"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readUserPrefs } from "@/lib/user-prefs";

export type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const finish = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          aria-describedby={pending ? "confirm-dialog-desc" : undefined}
        >
          <DialogHeader>
            <DialogTitle>{pending?.title ?? "Confirmer l'action"}</DialogTitle>
            <DialogDescription id="confirm-dialog-desc" className="whitespace-pre-line">
              {pending?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => finish(false)}>
              {pending?.cancelLabel ?? "Annuler"}
            </Button>
            <Button
              type="button"
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => finish(true)}
            >
              {pending?.confirmLabel ?? "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return React.useCallback(
    async (options: ConfirmOptions) => {
      if (options.destructive && !readUserPrefs().confirmBeforeDelete) {
        return true;
      }
      return ctx(options);
    },
    [ctx]
  );
}
