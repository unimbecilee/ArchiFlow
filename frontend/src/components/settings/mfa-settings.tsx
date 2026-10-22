"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  confirmMfa,
  disableMfa,
  enrollMfa,
  getMfaStatus,
  regenerateRecoveryCodes,
} from "@/services/mfa.service";
import { toast } from "sonner";

export function MfaSettings() {
  const queryClient = useQueryClient();
  const { data: enabled, isLoading } = useQuery({
    queryKey: ["mfa-status"],
    queryFn: getMfaStatus,
  });
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["mfa-status"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          Authentification à deux facteurs (TOTP)
        </p>
        {isLoading ? null : enabled ? (
          <Badge>Activée</Badge>
        ) : (
          <Badge className="text-muted-foreground">Désactivée</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Utilisez une application d’authentification (FreeOTP, Aegis, Microsoft
        Authenticator).
      </p>

      {!enabled && !secret && (
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const data = await enrollMfa();
              setSecret(data.secret);
              setQr(data.qr_code_url);
            } catch {
              toast.error("Impossible de démarrer l’enrôlement");
            } finally {
              setBusy(false);
            }
          }}
        >
          Activer le MFA
        </Button>
      )}

      {secret && !enabled && (
        <div className="space-y-3">
          <p className="text-sm">
            Scannez le QR ou saisissez la clé :{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              {secret}
            </code>
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="QR code TOTP"
              className="h-40 w-40 rounded-md border border-border bg-white"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qr)}`}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mfaEnrollCode">Code à 6 chiffres</Label>
            <Input
              id="mfaEnrollCode"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </div>
          <Button
            size="sm"
            disabled={busy || code.length !== 6}
            onClick={async () => {
              setBusy(true);
              try {
                const codes = await confirmMfa(code, secret);
                setRecovery(codes);
                setSecret("");
                setQr("");
                setCode("");
                await refresh();
                toast.success("MFA activé");
              } catch {
                toast.error("Code invalide");
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmer
          </Button>
        </div>
      )}

      {enabled && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mfaPassword">Mot de passe du compte</Label>
            <Input
              id="mfaPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !password}
              onClick={async () => {
                setBusy(true);
                try {
                  setRecovery(await regenerateRecoveryCodes(password));
                  toast.success("Codes de récupération régénérés");
                } catch {
                  toast.error("Mot de passe invalide");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Régénérer les codes
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !password}
              onClick={async () => {
                setBusy(true);
                try {
                  await disableMfa(password);
                  setRecovery([]);
                  setPassword("");
                  await refresh();
                  toast.success("MFA désactivé");
                } catch {
                  toast.error("Impossible de désactiver");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Désactiver
            </Button>
          </div>
        </div>
      )}

      {recovery.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">
            Codes de récupération — à conserver hors ligne
          </p>
          <ul className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-2">
            {recovery.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
