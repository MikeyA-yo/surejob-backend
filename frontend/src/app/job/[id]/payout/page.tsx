"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, formatNaira, getJob, type Job } from "@/api";

/** Shows the cash-out code for workers, or the animated Funds Released confirmation for customers. */
export default function PayoutScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getJob(jobId)
      .then((j) => active && setJob(j))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [user, jobId]);

  const code = job?.payout?.code ?? null;
  const isCustomer = job?.you === "customer";
  const forWorker = job?.you === "worker";

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the code and copy it manually.");
    }
  };

  // CUSTOMER VIEW: Dedicated "Funds Released" screen with animated checkmark
  if (isCustomer && job?.status === "PAID_OUT") {
    return (
      <AppShell
        backHref="/jobs"
        bottomAction={
          <Link
            href="/jobs"
            className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Done
          </Link>
        }
      >
        <div className="space-y-6 pt-4 text-center">
          {/* Animated Checkmark in a Circle */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 20,
            }}
            className="relative size-20 rounded-full bg-[#1B8A5A]/15 text-[#1B8A5A] flex items-center justify-center mx-auto shadow-xs"
          >
            {/* Soft expanding ripple pulse */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute inset-0 rounded-full bg-[#1B8A5A]/25 pointer-events-none"
            />

            {/* Smooth SVG Path Drawing Checkmark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-10 text-[#1B8A5A] relative z-10"
            >
              <motion.path
                d="M20 6L9 17l-5-5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: 0.2,
                  duration: 0.55,
                  ease: [0.25, 0.1, 0.25, 1.0],
                }}
              />
            </svg>
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-[#0B3C4F]">Funds Released</h1>
            <p className="text-sm font-normal text-[#14232B] mt-1.5 opacity-80 max-w-xs mx-auto leading-relaxed">
              Payment of <strong className="font-bold text-[#0B3C4F]">{formatNaira(job.amountKobo)}</strong> has been released from escrow to {job.worker.name}.
            </p>
          </div>

          {/* Settlement Details Card */}
          <div className="bg-[#EEF4F6] rounded-xl p-6 text-left space-y-3">
            <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
              Settlement Details
            </span>

            <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
              <span>Service</span>
              <span className="font-bold text-[#0B3C4F]">{job.title}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
              <span>Artisan</span>
              <span className="font-bold text-[#0B3C4F]">{job.worker.name}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
              <span>Escrow Status</span>
              <span className="font-bold text-[#1B8A5A]">Closed & Settled</span>
            </div>

            <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
              <span>Cover Issued</span>
              <span className="font-bold text-[#0B3C4F]">{job.policyRef ? "Active (Curacel)" : "Active"}</span>
            </div>

            <div className="pt-3 border-t border-[#0B3C4F]/10 flex justify-between items-baseline">
              <span className="text-sm font-bold text-[#0B3C4F]">Total Settled</span>
              <span className="text-2xl font-bold text-[#0B3C4F]">
                {formatNaira(job.amountKobo)}
              </span>
            </div>
          </div>

          {/* A worker without a SureJob account can't see the code, so the customer passes it on. */}
          {!job.worker.onPlatform && code && (
            <div className="bg-[#EEF4F6] rounded-xl p-6 space-y-3">
              <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
                Cash code for {job.worker.name}
              </span>
              <p className="text-sm font-normal text-[#14232B] opacity-80">
                {job.worker.name} isn&apos;t on SureJob. Pass this code on; they can cash it at any Ecobank agent, Xpress
                Point or ATM.
              </p>
              <span className="text-4xl font-bold font-mono tracking-widest text-[#0B3C4F] block break-all">
                {code.split("").join(" ")}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="h-10 px-4 rounded-xl text-sm font-bold bg-[#0B3C4F] text-white"
              >
                {copied ? "Copied" : "Copy code"}
              </button>
              <ErrorNote message={error} />
            </div>
          )}

          {/* Claim Link */}
          <div className="pt-2">
            <Link
              href={`/job/${jobId}/claim`}
              className="text-xs font-normal text-[#B23A48] hover:underline opacity-80"
            >
              Need to report an issue with this job? File a claim.
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // WORKER VIEW / DEFAULT VIEW
  return (
    <AppShell
      backHref={`/job/${jobId}`}
      bottomAction={
        code ? (
          <PrimaryButton onClick={handleCopy}>{copied ? "Copied" : "Copy Code"}</PrimaryButton>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-[#0B3C4F] leading-snug">
            {forWorker
              ? "Collect your cash. Show this code at any Ecobank agent, Xpress Point or ATM. No bank account or card needed."
              : `Funds released to ${job?.worker.name ?? "the worker"}.`}
          </h1>
          {job && <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">One-time withdrawal code for {job.title}.</p>}
        </div>

        <ErrorNote message={error} />
        {!job && !error && <p className="text-sm opacity-60">Loading…</p>}

        {job && job.status !== "PAID_OUT" && (
          <Card>
            <p className="text-sm">There&apos;s no payout yet. It&apos;s issued once the job is confirmed.</p>
          </Card>
        )}

        {job?.status === "PAID_OUT" && !code && (
          <Card>
            <p className="text-sm">
              {forWorker || !job.worker.onPlatform
                ? "The provider sent the code directly to the worker's phone."
                : `Only ${job.worker.name} can see this code.`}
            </p>
          </Card>
        )}

        {code && job && forWorker && (
          <div className="bg-[#EEF4F6] rounded-xl p-8 text-center space-y-4">
            <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">Payout Code</span>
            <span className="text-5xl font-bold font-mono tracking-widest text-[#0B3C4F] block break-all">
              {code.split("").join(" ")}
            </span>
            <span className="text-sm font-normal text-[#14232B] block">
              Amount: <strong className="font-bold text-[#0B3C4F]">{formatNaira(job.amountKobo)}</strong>
            </span>
            {job.payout?.expiresAt && (
              <span className="text-xs text-[#14232B] opacity-70 block">
                Expires {new Date(job.payout.expiresAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
