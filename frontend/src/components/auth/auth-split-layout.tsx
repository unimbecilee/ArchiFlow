"use client";

import { Archive } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion } from "framer-motion";

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
    <div className="grid min-h-[100dvh] bg-[#f6f7f9] lg:grid-cols-2">
      <section className="relative hidden bg-zinc-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
              <Archive className="h-5 w-5" weight="bold" />
            </div>
            <p className="text-sm font-semibold">ArchiFlow</p>
          </div>
          <h1 className="mt-10 max-w-lg text-4xl font-semibold tracking-tight">{heroTitle}</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">{heroCopy}</p>
        </div>
        <div className="mt-12 grid gap-3">
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

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="mb-6 lg:hidden">
            <p className="text-xs font-medium text-zinc-500">ArchiFlow</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-7 sm:p-8">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
            </div>
            {children}
            <div className="mt-6 text-center text-sm text-zinc-500">{footer}</div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
