"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <motion.div
      className={cn(
        "page-atmosphere relative z-[1] mx-auto max-w-[1400px] space-y-8 px-0 md:pl-2 lg:pl-6",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
