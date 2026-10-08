"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getQuote, payEscrow } from "@/api";

function formatKobo(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG");
}

export default function PayScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";
  const router = useRouter();

  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [jobCost, setJobCost] = useState<string>("₦13,500");
  const [coverCost, setCoverCost] = useState<string>("₦1,500");
  const [totalCost, setTotalCost] = useState<string>("₦15,000");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchQuote() {
      try {
        const quote = await getQuote(jobId);
        if (isMounted && quote) {
          setQuoteId(quote.quoteId);
          if (quote.premiumKobo !== undefined && quote.totalKobo !== undefined) {
            const baseJobKobo = quote.totalKobo - quote.premiumKobo;
            setJobCost(formatKobo(baseJobKobo > 0 ? baseJobKobo : 1350000));
            setCoverCost(formatKobo(quote.premiumKobo));
            setTotalCost(formatKobo(quote.totalKobo));
          }
        }
      } catch (err) {
        console.error("Failed to fetch quote for job:", err);
      }
    }
    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const handlePay = async () => {
    setLoading(true);
    try {
      let activeQuoteId = quoteId;
      if (!activeQuoteId) {
        try {
          const freshQuote = await getQuote(jobId);
          activeQuoteId = freshQuote.quoteId;
        } catch {
          activeQuoteId = "DEMO-QUOTE";
        }
      }
      await payEscrow(jobId, { quoteId: activeQuoteId || "DEMO-QUOTE" });
      router.push(`/job/${jobId}`);
    } catch (err) {
      console.error("Failed to pay escrow:", err);
      router.push(`/job/${jobId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      backHref="/book"
      bottomAction={
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
        >
          Pay into escrow
        </button>
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
            <span className="font-bold text-[#0B3C4F]">{jobCost}</span>
          </div>

          <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
            <span>Cover cost</span>
            <span className="font-bold text-[#0B3C4F]">{coverCost}</span>
          </div>

          <div className="pt-4 flex justify-between items-baseline">
            <span className="text-base font-bold text-[#0B3C4F]">Total</span>
            <span className="text-3xl font-bold text-[#0B3C4F]">{totalCost}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
