"use client";

import React, { use, useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { getJob, confirmJob } from "@/api";

export default function PayoutScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";
  const [copied, setCopied] = useState(false);
  const [payoutCode, setPayoutCode] = useState<string>("84291");
  const [amountStr, setAmountStr] = useState<string>("₦13,500");

  useEffect(() => {
    let isMounted = true;

    async function loadPayout() {
      try {
        const job = await getJob(jobId);
        if (isMounted && job) {
          if (job.amountKobo) {
            setAmountStr("₦" + (job.amountKobo / 100).toLocaleString("en-NG"));
          }
          if (job.payout?.code) {
            setPayoutCode(job.payout.code);
            return;
          }
        }

        // If payout code not yet issued, trigger worker confirmation to complete second confirmation
        const confirmedJob = await confirmJob(jobId, { party: "worker" });
        if (isMounted && confirmedJob.payout?.code) {
          setPayoutCode(confirmedJob.payout.code);
        }
      } catch (err) {
        console.error("Failed to load payout code:", err);
      }
    }

    loadPayout();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const displayCode = payoutCode.split("").join(" ");

  const handleCopy = () => {
    navigator.clipboard.writeText(payoutCode);
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
            {displayCode}
          </span>

          <span className="text-sm font-normal text-[#14232B] block">
            Amount: <strong className="font-bold text-[#0B3C4F]">{amountStr}</strong>
          </span>
        </div>
      </div>
    </AppShell>
  );
}
