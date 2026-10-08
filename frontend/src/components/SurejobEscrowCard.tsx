"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, Copy, Check, AlertCircle } from "lucide-react";

export default function SurejobEscrowCard() {
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<"customer" | "worker">("customer");
  const [isReleased, setIsReleased] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#EEF4F6] text-[#14232B] flex flex-col items-center px-4 py-6">
      {/* Centered Single Column: Max-width 420px */}
      <main className="w-full max-w-[420px] flex flex-col gap-4 pb-24">
        
        {/* Simple Functional Header */}
        <header className="flex items-center justify-between pt-2 pb-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0B3C4F]">
              Surejob
            </h1>
            <span className="text-xs font-medium text-[#14232B]">
              #SJ-1049
            </span>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-[#0B3C4F] shadow-sm">
            Escrow Active
          </span>
        </header>

        {/* Card 1: Role Switcher */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0B3C4F] mb-3">
            Active Mode
          </h2>
          <div className="flex items-center bg-[#EEF4F6] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "customer"
                  ? "bg-[#0B3C4F] text-white shadow-sm"
                  : "bg-transparent text-[#14232B]"
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "worker"
                  ? "bg-[#0B3C4F] text-white shadow-sm"
                  : "bg-transparent text-[#14232B]"
              }`}
            >
              Worker
            </button>
          </div>
        </section>

        {/* Card 2: Job & Payment Breakdown */}
        <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0B3C4F]">
                Service
              </span>
              <h2 className="text-lg font-bold text-[#0B3C4F] mt-0.5">
                Brake repair
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0B3C4F]">
                Amount
              </span>
              <h2 className="text-2xl font-black text-[#0B3C4F]">
                N15,000
              </h2>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-[#14232B] font-medium">
            <span className="flex items-center gap-1.5 text-[#1B8A5A] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#1B8A5A]" />
              Funds Secured
            </span>
            <span className="text-[#14232B]">
              Cover Included
            </span>
          </div>
        </section>

        {/* Card 3: Status Timeline */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0B3C4F] mb-4">
            Escrow Timeline
          </h2>

          <div className="flex flex-col gap-4">
            {/* Step 1: Booked */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#1B8A5A] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-[#1B8A5A] uppercase tracking-wide">
                  1. Booked
                </div>
                <p className="text-xs text-[#14232B] mt-0.5">
                  Job accepted by verified mechanic
                </p>
              </div>
            </div>

            {/* Step 2: Escrowed */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#1B8A5A] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-[#1B8A5A] uppercase tracking-wide">
                  2. Escrowed
                </div>
                <p className="text-xs text-[#14232B] mt-0.5">
                  N15,000 locked safely in vault
                </p>
              </div>
            </div>

            {/* Step 3: In Progress */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#0B3C4F] shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wide">
                  3. In Progress
                </h3>
                <p className="text-xs text-[#14232B] mt-0.5">
                  Brake pads replacement underway
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Card 4: Worker Payout Code */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0B3C4F]">
              Worker Payout Code
            </h2>
            <span className="text-[11px] font-bold text-[#1E3A2B]">
              Cash Release
            </span>
          </div>

          <h3 className="text-sm font-bold text-[#0B3C4F] mb-1">
            Collect your cash
          </h3>
          <p className="text-xs text-[#14232B] mb-4">
            Give this 4-digit code to the artisan only after the repair is completed.
          </p>

          <div className="p-4 bg-[#EEF4F6] rounded-xl flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.3em] text-[#1E3A2B] font-mono pl-1">
              4 8 2 9
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2.5 rounded-lg bg-white text-[#14232B] shadow-sm transition-colors cursor-pointer"
              title="Copy Code"
              aria-label="Copy Code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#1B8A5A]" />
              ) : (
                <Copy className="w-4 h-4 text-[#14232B]" />
              )}
            </button>
          </div>
        </section>

        {/* Card 5: Dispute Resolution Alert */}
        <section className="bg-white rounded-xl p-6 shadow-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#B23A48] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xs font-bold text-[#0B3C4F]">
              Protection Guarantee
            </h2>
            <p className="text-xs text-[#14232B] mt-0.5">
              Not satisfied with the job? File a claim before sharing the code. Funds will remain locked.
            </p>
          </div>
        </section>

      </main>

      {/* Fixed Call to Action Button:
          - Full width (inside max-w-[420px])
          - Exactly 48px high (h-12)
          - Primary Button: bg-[#1E3A2B] or bg-[#0B3C4F] text-white
      */}
      <aside className="fixed bottom-0 left-0 right-0 p-4 bg-[#EEF4F6] z-50 flex justify-center">
        <div className="w-full max-w-[420px]">
          <button
            type="button"
            onClick={() => setIsReleased(!isReleased)}
            className={`w-full h-12 text-sm font-bold rounded-xl flex items-center justify-center shadow-sm cursor-pointer ${
              isReleased
                ? "bg-[#0B3C4F] text-white"
                : "bg-[#1E3A2B] text-white hover:bg-[#162E22]"
            }`}
          >
            {isReleased ? "Code Authorized • Released" : "Authorize Release • N15,000"}
          </button>
        </div>
      </aside>
    </div>
  );
}
