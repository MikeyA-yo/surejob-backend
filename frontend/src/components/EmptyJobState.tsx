"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyJobStateProps {
  actionHref?: string;
  onActionClick?: () => void;
  className?: string;
}

export function EmptyJobState({
  actionHref = "/book",
  onActionClick,
  className = "",
}: EmptyJobStateProps) {
  const ButtonContent = (
    <>
      <span>Book an Artisan</span>
      <Plus className="size-5 shrink-0" strokeWidth={2.5} />
    </>
  );

  const buttonClasses =
    "inline-flex items-center justify-center gap-2 min-h-[48px] px-8 bg-[#E6007E] text-white font-bold rounded-xl transition-all duration-200 hover:opacity-95 active:scale-[0.98]";

  return (
    <div
      className={`bg-[#EEF4F6] rounded-3xl py-24 px-6 text-center flex flex-col items-center justify-center ${className}`}
    >
      {/* Minimalist Floating Icon inside White Circle */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="bg-white rounded-full w-20 h-20 shadow-sm flex items-center justify-center mb-6 text-[#0B3C4F]"
      >
        <ShieldCheck className="size-9 text-[#0B3C4F]" strokeWidth={2} />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-bold text-[#0B3C4F] mb-3">
        No active jobs yet
      </h2>

      {/* Subtext */}
      <p className="text-sm text-[#14232B] opacity-80 max-w-sm mx-auto mb-8 leading-relaxed font-normal">
        Hire an artisan, lock the payment in secure escrow, and get automatic
        protection against property damage.
      </p>

      {/* Chunky Borderless CTA Button */}
      {actionHref ? (
        <Link href={actionHref} className={buttonClasses}>
          {ButtonContent}
        </Link>
      ) : (
        <button type="button" onClick={onActionClick} className={buttonClasses}>
          {ButtonContent}
        </button>
      )}
    </div>
  );
}

export default EmptyJobState;
