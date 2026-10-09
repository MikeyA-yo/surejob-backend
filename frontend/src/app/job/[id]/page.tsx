"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { confirmJob, errorMessage, formatNaira, getJob, type Job } from "@/api";
import PriceNegotiation from "@/components/PriceNegotiation";
import { canNegotiate, readyToPay, STATUS_LABELS } from "@/lib/jobStatus";

const POLL_MS = 2000;
const FINISHED: Job["status"][] = ["PAID_OUT", "CLAIM_FILED"];

export default function EscrowStatusScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Poll so each side sees the other's confirmation; stop once the job is finished.
  const finished = job ? FINISHED.includes(job.status) : false;
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () =>
      getJob(jobId)
        .then((j) => {
          if (!active) return;
          setJob(j);
          setLoadError(null);
        })
        .catch((err) => active && setLoadError(errorMessage(err)));
    load();
    const interval = finished ? undefined : setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, jobId, finished]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await confirmJob(jobId);
      setJob(updated);
      if (updated.status === "PAID_OUT") {
        router.push(`/job/${jobId}/payout`);
      }
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell backHref="/jobs" bottomAction={job ? <PrimaryAction job={job} busy={submitting} onConfirm={handleConfirm} /> : undefined}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3C4F]">Escrow Status</h1>
          {job && (
            <p className="text-sm font-normal text-[#14232B] mt-1 opacity-70">
              {job.title} · {formatNaira(job.amountKobo)} ·{" "}
              {job.you === "customer" ? `Worker: ${job.worker.name}` : `Customer: ${job.customer.name}`}
            </p>
          )}
        </div>

        <ErrorNote message={loadError ?? actionError} />
        {!job && !loadError && <p className="text-sm opacity-60">Loading…</p>}

        {job && (
          <>
            <Card>
              <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">Status</span>
              <span className="text-lg font-bold text-[#0B3C4F] block mt-1">{STATUS_LABELS[job.status]}</span>
              <Guidance job={job} />
            </Card>

            {canNegotiate(job) && <PriceNegotiation job={job} onChange={setJob} />}

            <Card label="Progress">
              <Timeline job={job} />
            </Card>

            {(job.status === "INSURED" || job.status === "CONFIRMED") && (
              <div className="text-center">
                <Link href={`/job/${jobId}/claim`} className="text-sm font-bold text-[#B23A48] hover:underline">
                  Something wrong with the job? File a claim.
                </Link>
              </div>
            )}

            <Card label="Activity">
              <ul className="mt-2 space-y-2">
                {[...job.events].reverse().map((e, i) => (
                  <li key={`${e.at}-${i}`} className="text-sm text-[#14232B]">
                    <span className="opacity-60 text-xs mr-2">{new Date(e.at).toLocaleTimeString()}</span>
                    {e.detail}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

/** What this viewer should do next, in one sentence. */
function Guidance({ job }: { job: Job }) {
  const youConfirmed = job.confirmations[job.you];
  const offPlatform = !job.worker.onPlatform;
  let text: string;

  switch (job.status) {
    case "BOOKED":
      if (job.pendingOffer && job.pendingOffer.by !== job.you) text = "You have a price offer to answer below.";
      else if (job.pendingOffer) text = "Waiting for an answer to your price offer.";
      else if (!job.priceAgreed) {
        text =
          job.you === "worker"
            ? "Accept the price below, or propose a different one."
            : `Waiting for ${job.worker.name} to accept the price. You can also propose a different one.`;
      } else if (job.you === "customer") {
        text = job.worker.onPlatform
          ? `${job.worker.name} accepted the price. Pay into escrow to start the job.`
          : "Pay into escrow to start the job.";
      } else text = "You accepted the price. Waiting for the customer to pay into escrow.";
      break;
    case "ESCROWED":
      text = "Payment is held. Cover is being issued.";
      break;
    case "INSURED":
      if (offPlatform) text = `${job.worker.name} isn't on SureJob, so your confirmation releases their payment.`;
      else if (!youConfirmed) text = "Confirm once the job is done. Payment is released when both of you confirm.";
      else text = `You've confirmed. Waiting for ${job.you === "customer" ? job.worker.name : job.customer.name} to confirm.`;
      break;
    case "CONFIRMED":
      text = "Both confirmed, but the payout didn't go through. Try again.";
      break;
    case "PAID_OUT":
      text = job.you === "customer"
        ? `Payment released from escrow to ${job.worker.name}.`
        : job.payout?.code
        ? "Your cash code is ready."
        : `Payout sent to ${job.worker.name}.`;
      break;
    case "CLAIM_FILED":
      text = `Claim ${job.claim?.ref ?? ""} is under review. The payout is on hold.`;
      break;
  }
  return <p className="text-sm text-[#14232B] mt-2 opacity-80">{text}</p>;
}

function PrimaryAction({ job, busy, onConfirm }: { job: Job; busy: boolean; onConfirm: () => void }) {
  const linkClass =
    "w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95";

  if (job.status === "BOOKED" && job.you === "customer") {
    if (!readyToPay(job)) {
      return (
        <PrimaryButton disabled onClick={() => undefined}>
          {job.pendingOffer ? "Agree on the price to continue" : `Waiting for ${job.worker.name} to accept`}
        </PrimaryButton>
      );
    }
    return (
      <Link href={`/job/${job.id}/pay`} className={linkClass}>
        Continue to payment
      </Link>
    );
  }
  if (job.status === "PAID_OUT") {
    if (job.you === "worker" && job.payout?.code) {
      return (
        <Link href={`/job/${job.id}/payout`} className={linkClass}>
          View cash code
        </Link>
      );
    }
    if (job.you === "customer") {
      return (
        <Link href={`/job/${job.id}/payout`} className={linkClass}>
          View release confirmation
        </Link>
      );
    }
  }
  if (job.status === "CONFIRMED") {
    return (
      <PrimaryButton onClick={onConfirm} busy={busy}>
        Retry payout
      </PrimaryButton>
    );
  }
  if (job.status === "INSURED") {
    const waiting = job.confirmations[job.you];
    return (
      <PrimaryButton onClick={onConfirm} busy={busy} disabled={waiting}>
        {waiting ? "Confirmed · waiting for the other side" : "Confirm job done"}
      </PrimaryButton>
    );
  }
  return null;
}

function Timeline({ job }: { job: Job }) {
  const paidOrLater = job.status !== "BOOKED";
  const steps = [
    { name: "Paid into escrow", done: job.escrowRef !== null },
    { name: "Cover issued", done: job.policyRef !== null },
    {
      name: job.worker.onPlatform ? "Customer confirmed" : "Customer confirmed (releases payout)",
      done: job.confirmations.customer,
    },
    ...(job.worker.onPlatform ? [{ name: "Worker confirmed", done: job.confirmations.worker }] : []),
    job.status === "CLAIM_FILED"
      ? { name: "Claim filed · payout held", done: true, alert: true }
      : { name: "Paid out", done: job.status === "PAID_OUT" },
  ];

  return (
    <div className="relative mt-4">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const dot = "alert" in step && step.alert ? "bg-[#B23A48]" : step.done ? "bg-[#1B8A5A]" : "bg-[#14566E]/30";
        return (
          <div key={step.name} className="relative pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[5px] top-[14px] bottom-0 w-0 border-l-2 border-dotted border-[#0B3C4F]/30" />}
            <div className="flex items-center gap-4">
              <div className={`relative z-10 size-3 rounded-full shrink-0 ${dot}`} />
              <span className={`text-base ${step.done ? "font-bold text-[#0B3C4F]" : "font-normal text-[#14232B] opacity-70"}`}>
                {step.name}
              </span>
            </div>
          </div>
        );
      })}
      {!paidOrLater && job.you === "customer" && (
        <p className="text-xs opacity-60 mt-4">Nothing is charged until you pay into escrow.</p>
      )}
    </div>
  );
}
