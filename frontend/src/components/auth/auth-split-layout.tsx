"use client";

import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";

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
    <motion.div className="grid min-h-[100dvh] bg-[#f9fafb] lg:grid-cols-2">
      <motion.section
        className="relative hidden overflow-hidden bg-zinc-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 90, damping: 22 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.22),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.06),transparent_32%)]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
            ArchiFlow v3
          </p>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tighter md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
            {heroCopy}
          </p>
        </div>
        <motion.div
          className="relative mt-12 grid gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {features.map((item) => (
            <motion.div
              key={item.title}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
            >
              <item.icon className="h-6 w-6 text-emerald-400" weight="duotone" />
              <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{item.copy}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="flex items-center justify-center px-4 py-10 sm:px-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.05 }}
      >
        <div className="w-full max-w-md">
          <motion.div className="mb-8 lg:hidden">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
              ArchiFlow
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              {title}
            </h1>
          </motion.div>

          <motion.div
            className="surface-bento p-8 sm:p-10"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{subtitle}</p>
            </div>
            {children}
            <div className="mt-6 text-center text-sm text-zinc-600">{footer}</div>
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}
