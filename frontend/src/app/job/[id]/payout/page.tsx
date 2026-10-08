"use client";

import React, { use, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, formatNaira, getJob, type Job } from "@/api";

/** Shows the cash-out code. Read-only: it never confirms anything on anyone's behalf. */
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
              : `Pass this code to ${job?.worker.name ?? "the worker"}. They can cash it at any Ecobank agent, Xpress Point or ATM.`}
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

        {code && job && (
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
