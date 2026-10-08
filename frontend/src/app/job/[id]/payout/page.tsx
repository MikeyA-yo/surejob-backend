"use client";

import React, { use, useState } from "react";
import AppShell from "@/components/AppShell";

export default function PayoutScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";
  const [copied, setCopied] = useState(false);

  const code = "8 4 2 9 1";

  const handleCopy = () => {
    navigator.clipboard.writeText("84291");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell
      backHref={`/job/${jobId}`}
      bottomAction={
        <button
          type="button"
          onClick={handleCopy}
          className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
        >
          {copied ? "Copied" : "Copy Code"}
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-[#0B3C4F] leading-snug">
            Collect your cash. Show this code at any Ecobank agent, Xpress Point or ATM. No bank account or card needed.
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            One-time withdrawal code for Job #{jobId}.
          </p>
        </div>

        {/* Centerpiece: Massive Bold One-Time Code */}
        <div className="bg-[#EEF4F6] rounded-xl p-8 text-center space-y-4">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
            Payout Code
          </span>

          <span className="text-5xl font-bold font-mono tracking-widest text-[#0B3C4F] block">
            {code}
          </span>

          <span className="text-sm font-normal text-[#14232B] block">
            Amount: <strong className="font-bold text-[#0B3C4F]">₦13,500</strong>
          </span>
        </div>
      </div>
    </AppShell>
  );
}
