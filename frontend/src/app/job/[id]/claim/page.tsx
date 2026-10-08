"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { claimJob } from "@/api";

export default function ClaimScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";
  const [reason, setReason] = useState("Damage");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const normalizedReason = reason.toLowerCase().includes("inj")
        ? "injury"
        : reason.toLowerCase().includes("not")
        ? "not_done"
        : "damage";

      await claimJob(jobId, {
        filedBy: "customer",
        reason: normalizedReason,
        details: details || "Claim filed by customer via mobile app",
      });
    } catch (err) {
      console.error("Failed to submit claim:", err);
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      backHref={`/job/${jobId}`}
      bottomAction={
        submitted ? (
          <Link
            href={`/job/${jobId}`}
            className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Back to Status
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 bg-[#B23A48] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Submit Claim
          </button>
        )
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#0B3C4F] leading-snug">
            Something wrong with the job? File a claim.
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            Escrow payout is held while the mediation team reviews your report.
          </p>
        </div>

        {submitted ? (
          <div className="bg-[#EEF4F6] rounded-xl p-6 space-y-2">
            <h2 className="text-base font-bold text-[#0B3C4F]">
              Claim Submitted
            </h2>
            <p className="text-sm font-normal text-[#14232B] opacity-80 leading-relaxed">
              Your claim for <strong>{reason}</strong> has been logged. Escrow funds for Job #{jobId} remain locked.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason Select - Unboxed Soft Fill, No Borders */}
            <div>
              <label htmlFor="reason" className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                Reason
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-12 px-4 bg-[#EEF4F6] rounded-xl text-sm font-normal text-[#14232B] border-0 outline-none appearance-none"
              >
                <option value="Damage">Damage</option>
                <option value="Injury">Injury</option>
                <option value="Job not done">Job not done</option>
              </select>
            </div>

            {/* Details Textarea - Unboxed Soft Fill, No Borders */}
            <div>
              <label htmlFor="details" className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                Details
              </label>
              <textarea
                id="details"
                rows={5}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what went wrong with the repair..."
                className="w-full p-4 bg-[#EEF4F6] rounded-xl text-sm font-normal text-[#14232B] border-0 outline-none resize-none placeholder:text-[#14232B]/40"
              />
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
