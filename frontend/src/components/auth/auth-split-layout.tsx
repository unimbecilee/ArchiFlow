"use client";

import { Archive } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { HeroDecor, PanelDecor } from "@/components/backgrounds";

type AuthFeature = {
  icon: Icon;
  title: string;
  copy: string;
};

type AuthSplitLayoutProps = {
  title: string;
  subtitle: string;
  heroTitle: string;
  heroCopy: string;
  features: AuthFeature[];
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthSplitLayout({
  title,
  subtitle,
  heroTitle,
  heroCopy,
  features,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between" data-theme-allow-dark>
        <HeroDecor />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
              <Archive className="h-5 w-5" weight="bold" />
            </div>
            <p className="text-sm font-semibold">ArchiFlow</p>
          </div>
          <h1 className="mt-10 max-w-lg text-4xl font-semibold tracking-tight">{heroTitle}</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">{heroCopy}</p>
        </div>
        <div className="relative z-10 mt-12 grid gap-3">
          {features.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3), ease: "easeOut" }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <item.icon className="h-5 w-5 text-emerald-400" weight="duotone" />
              <p className="mt-3 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{item.copy}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <PanelDecor />
        <motion.div
          className="relative z-10 w-full max-w-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="mb-6 lg:hidden">
            <p className="text-xs font-medium text-muted-foreground">ArchiFlow</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          </div>
          <div className="rounded-lg border border-border bg-card p-7 sm:p-8 shadow-e1">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
