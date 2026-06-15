"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowSquareOut,
  CloudArrowUp,
  ShareNetwork,
  UsersThree,
  Archive,
} from "@phosphor-icons/react";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { Button } from "@/components/ui/button";
import { ARCHIFLOW_PLUS } from "@/lib/branding";
import { fetchPydioConfig, fetchPydioSSOLaunchUrl } from "@/lib/integrations";

export default function CollaborationPage() {
  const [ssoEnabled, setSsoEnabled] = useState<boolean | null>(null);
  const [ssoNote, setSsoNote] = useState<string | undefined>();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  useEffect(() => {
    fetchPydioConfig().then((config) => {
      if (!config) {
        setSsoEnabled(false);
        return;
      }
      setSsoEnabled(config.sso_enabled);
      setSsoNote(config.sso_note);
    });
  }, []);

  const openArchiFlowPlus = async () => {
    setSsoError(null);
    setSsoLoading(true);
    try {
      const url = await fetchPydioSSOLaunchUrl();
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setSsoError("Connexion impossible. Reessayez ou contactez un administrateur.");
      }
    } catch {
      setSsoError("Connexion impossible. Reessayez ou contactez un administrateur.");
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Collaboration"
        title={ARCHIFLOW_PLUS}
        description="Workspaces d'equipe pour co-edition et partage. La conservation reglementaire et la GED centrale restent dans ArchiFlow."
        icon={<ShareNetwork className="h-6 w-6" weight="duotone" />}
      />

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <motion.div
          className="surface-bento overflow-hidden p-8 md:p-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-md space-y-4">
              <span className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
                <UsersThree className="h-7 w-7" weight="duotone" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Acces workspace
                </p>
                <p className="text-base leading-relaxed text-zinc-600">
                  Ouvrez {ARCHIFLOW_PLUS} avec votre compte ArchiFlow — une seule connexion, sans
                  ressaisir vos identifiants.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:min-w-[14rem]">
              {ssoEnabled === false && (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                  {ssoNote ||
                    `${ARCHIFLOW_PLUS} n'est pas encore disponible pour votre compte.`}
                </p>
              )}
              {ssoError && (
                <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-800">
                  {ssoError}
                </p>
              )}
              <Button
                size="lg"
                disabled={ssoLoading || ssoEnabled === false || ssoEnabled === null}
                className="gap-2 shadow-[0_12px_32px_-12px_hsla(160,61%,35%,0.55)]"
                onClick={() => void openArchiFlowPlus()}
              >
                <ArrowSquareOut className="h-4 w-4" weight="bold" />
                {ssoLoading ? "Connexion..." : ARCHIFLOW_PLUS}
              </Button>
              {ssoEnabled === null && (
                <p className="text-center text-xs text-zinc-500">Verification du service...</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="glass-panel flex flex-col gap-4 rounded-[2rem] p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.06 }}
        >
          <span className="inline-flex w-fit rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-700">
            <Archive className="h-5 w-5" weight="duotone" />
          </span>
          <p className="text-sm font-semibold text-zinc-900">Verser vers ArchiFlow</p>
          <p className="text-sm leading-relaxed text-zinc-600">
            Dans {ARCHIFLOW_PLUS}, clic droit sur un fichier puis{" "}
            <strong className="font-medium text-zinc-800">Archiver vers MinIO (ArchiFlow)</strong>{" "}
            pour declencher la conservation dans le coffre central.
          </p>
        </motion.div>
      </section>

      <PagePanel title="Rappel" subtitle="Collaboration et archivage">
        <div className="flex items-start gap-4 text-sm leading-relaxed text-zinc-600">
          <span className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-700">
            <CloudArrowUp className="h-5 w-5" weight="duotone" />
          </span>
          <p>
            <strong className="font-medium text-zinc-900">{ARCHIFLOW_PLUS}</strong> couvre le
            travail d&apos;equipe en temps reel. La recherche GED, les workflows et l&apos;archivage
            long terme vivent dans ArchiFlow, avec stockage objet securise.
          </p>
        </div>
      </PagePanel>
    </PageFrame>
  );
}
