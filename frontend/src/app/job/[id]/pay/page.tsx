"use client";

import React, { use } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

export default function PayScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";

  return (
    <AppShell
      backHref="/book"
      bottomAction={
        <Link
          href={`/job/${jobId}`}
          className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
        >
          Pay into escrow
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Title Statement */}
        <div>
          <h1 className="text-xl font-bold text-[#0B3C4F] leading-snug">
            Your money is protected. We hold your payment until the job is done. Cover for this job is included.
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            Funds remain in escrow and are only released after your confirmation.
          </p>
        </div>

        {/* Breakdown Card */}
        <div className="bg-[#EEF4F6] rounded-xl p-6 space-y-4">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
            Cost Breakdown
          </span>

          <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
            <span>Job cost</span>
            <span className="font-bold text-[#0B3C4F]">₦13,500</span>
          </div>

          <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
            <span>Cover cost</span>
            <span className="font-bold text-[#0B3C4F]">₦1,500</span>
          </div>

          <div className="pt-4 flex justify-between items-baseline">
            <span className="text-base font-bold text-[#0B3C4F]">Total</span>
            <span className="text-3xl font-bold text-[#0B3C4F]">₦15,000</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
