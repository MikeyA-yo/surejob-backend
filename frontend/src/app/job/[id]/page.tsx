"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useRole } from "@/context/RoleContext";
import { getJob, confirmJob, type Job } from "@/api";

export default function EscrowStatusScreen({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams?.id || "1";
  const router = useRouter();
  const { role } = useRole();

  const [job, setJob] = useState<Job | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Poll GET /api/jobs/:id every 2 seconds to update timeline automatically
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const data = await getJob(jobId);
        if (isMounted && data) {
          setJob(data);
          if (data.confirmations?.customer || data.status === "PAID_OUT" || data.status === "CONFIRMED") {
            setConfirmed(true);
          }
        }
      } catch (err) {
        console.error("Polling error for job status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setConfirmed(true);
    try {
      const party = role === "worker" ? "worker" : "customer";
      const updated = await confirmJob(jobId, { party });
      setJob(updated);

      // If customer confirmed, also trigger worker confirmation for the demo payout code
      if (party === "customer") {
        try {
          await confirmJob(jobId, { party: "worker" });
        } catch (workerErr) {
          console.error("Auto worker confirmation demo error:", workerErr);
        }
      }
    } catch (err) {
      console.error("Failed to confirm job:", err);
    } finally {
      setTimeout(() => {
        router.push(`/job/${jobId}/payout`);
      }, 400);
    }
  };

  const isPaid = !job || job.status !== "BOOKED" || job.events?.some((e) => e.type === "payment.escrowed");
  const isEscrowed = !job || job.status !== "BOOKED" || job.events?.some((e) => e.type === "payment.escrowed");
  const isInsured = !job || job.status !== "BOOKED" || job.events?.some((e) => e.type === "policy.issued");
  const isStepDone = confirmed || (job ? (job.confirmations?.customer || job.status === "CONFIRMED" || job.status === "PAID_OUT") : false);

  const steps = [
    { name: "Paid", done: isPaid },
    { name: "Held in escrow", done: isEscrowed },
    { name: "Cover issued", done: isInsured },
    { name: "In progress", done: isStepDone },
  ];

  return (
    <AppShell
      backHref="/book"
      bottomAction={
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
        >
          {confirmed ? "Confirmed" : "Confirm Job Done"}
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3C4F]">
            Escrow Status
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-1 opacity-70">
            {job?.title || "Mechanic, Brake repair"} • ₦{job?.amountKobo ? (job.amountKobo / 100).toLocaleString("en-NG") : "15,000"}
          </p>
        </div>

        {/* Worker Role Banner */}
        {role === "worker" && (
          <div className="bg-[#EEF4F6] rounded-xl p-6">
            <h2 className="text-base font-bold text-[#0B3C4F]">
              Waiting for customer confirmation
            </h2>
            <p className="text-sm font-normal text-[#14232B] mt-1 opacity-70">
              The customer must confirm the job is complete before the payout code is issued.
            </p>
          </div>
        )}

        {/* Vertical Status Timeline with Dotted Connecting Line */}
        <div className="bg-[#EEF4F6] rounded-xl p-6">
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-6">
            Status
          </span>

          <div className="relative">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <div key={idx} className="relative pb-8 last:pb-0">
                  {/* Dotted connecting line between dots */}
                  {!isLast && (
                    <div className="absolute left-[5px] top-[14px] bottom-0 w-0 border-l-2 border-dotted border-[#0B3C4F]/30" />
                  )}

                  <div className="flex items-center gap-4">
                    {/* Dot */}
                    <div
                      className={`relative z-10 size-3 rounded-full shrink-0 ${
                        step.done ? "bg-[#1B8A5A]" : "bg-[#14566E]"
                      }`}
                    />
                    <span
                      className={`text-base ${
                        step.done
                          ? "font-bold text-[#0B3C4F]"
                          : "font-normal text-[#14232B] opacity-70"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* File a Claim Link */}
        <div className="pt-2 text-center">
          <Link
            href={`/job/${jobId}/claim`}
            className="text-sm font-bold text-[#B23A48] hover:underline"
          >
            Something wrong with the job? File a claim.
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
