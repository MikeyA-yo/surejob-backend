"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createJob } from "@/api";

export default function BookScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const job = await createJob({
        customerId: "tunde1",
        workerId: "emeka1",
        title: "Brake repair",
        amountKobo: 1500000,
      });
      router.push(`/job/${job.id}/pay`);
    } catch (err) {
      console.error("Failed to create job:", err);
      router.push("/job/1/pay");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      bottomAction={
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
        >
          Continue
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3C4F]">
            Book Service
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-1 opacity-70">
            Review service and assigned worker.
          </p>
        </div>

        {/* Service Card */}
        <div className="bg-[#EEF4F6] rounded-xl p-6">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
            Service
          </span>
          <h2 className="text-lg font-bold text-[#0B3C4F] mt-1">
            Mechanic, Brake repair
          </h2>
          <p className="text-sm font-normal text-[#14232B] mt-2 leading-relaxed">
            Front brake pad replacement, caliper inspection, and hydraulic fluid check.
          </p>
        </div>

        {/* Worker Card */}
        <div className="bg-[#EEF4F6] rounded-xl p-6">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
            Worker
          </span>
          <h2 className="text-lg font-bold text-[#0B3C4F] mt-1">
            Emeka
          </h2>
          <p className="text-sm font-normal text-[#14232B] mt-2">
            Automotive technician • 4.9 rating (86 jobs) • Verified
          </p>
        </div>

        {/* Price Card */}
        <div className="bg-[#EEF4F6] rounded-xl p-6">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
            Total Price
          </span>
          <span className="text-3xl font-bold text-[#0B3C4F] mt-1 block">
            ₦15,000
          </span>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            Funds held in escrow until completion.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
