"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { claimJob, errorMessage, type ClaimReason, type Job } from "@/api";

const REASONS: { value: ClaimReason; label: string }[] = [
  { value: "damage", label: "Damage" },
  { value: "injury", label: "Injury" },
  { value: "not_done", label: "Job not done" },
];

export default function ClaimScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [reason, setReason] = useState<ClaimReason>("damage");
  const [details, setDetails] = useState("");
  const [filed, setFiled] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setFiled(await claimJob(jobId, reason, details.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      backHref={`/job/${jobId}`}
      bottomAction={
        filed ? (
          <Link
            href={`/job/${jobId}`}
            className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Back to Status
          </Link>
        ) : (
          <PrimaryButton tone="danger" onClick={() => handleSubmit()} busy={submitting}>
            Submit Claim
          </PrimaryButton>
        )
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#0B3C4F] leading-snug">Something wrong with the job? File a claim.</h1>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            The payout is held while the insurer reviews your report.
          </p>
        </div>

        <ErrorNote message={error} />

        {filed ? (
          <Card>
            <h2 className="text-base font-bold text-[#0B3C4F]">Claim submitted</h2>
            <p className="text-sm font-normal text-[#14232B] opacity-80 leading-relaxed mt-2">
              Claim <strong>{filed.claim?.ref}</strong> for{" "}
              <strong>{REASONS.find((r) => r.value === filed.claim?.reason)?.label.toLowerCase()}</strong> was received. The
              payout for {filed.title} stays on hold.
            </p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="reason" className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                Reason
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ClaimReason)}
                className="w-full h-12 px-4 bg-[#EEF4F6] rounded-xl text-sm font-normal text-[#14232B] border-0 outline-none appearance-none"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="details" className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                Details
              </label>
              <textarea
                id="details"
                rows={5}
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what went wrong…"
                className="w-full p-4 bg-[#EEF4F6] rounded-xl text-sm font-normal text-[#14232B] border-0 outline-none resize-none placeholder:text-[#14232B]/40"
              />
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
