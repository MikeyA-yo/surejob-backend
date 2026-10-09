"use client";

import React, { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, formatNaira, getJob, getQuote, payEscrow, type Job, type Quote } from "@/api";
import { readyToPay } from "@/lib/jobStatus";

export default function PayScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    // Quoting replaces the previous quote, so only quote once per visit (React may run effects twice in dev).
    if (!user || loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const current = await getJob(jobId);
        setJob(current);
        if (current.status !== "BOOKED" || current.you !== "customer") {
          router.replace(`/job/${jobId}`);
          return;
        }
        if (!readyToPay(current)) return; // the worker hasn't accepted the price yet
        setQuote(await getQuote(jobId));
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [user, jobId, router]);

  const handlePay = async () => {
    if (!quote) return;
    setPaying(true);
    setError(null);
    try {
      await payEscrow(jobId, quote.quoteId);
      router.push(`/job/${jobId}`);
    } catch (err) {
      setError(errorMessage(err));
      setPaying(false);
    }
  };

  return (
    <AppShell
      backHref="/jobs"
      bottomAction={
        <PrimaryButton onClick={handlePay} busy={paying} disabled={!quote}>
          {quote ? `Pay ${formatNaira(quote.totalKobo)} into escrow` : "Pay into escrow"}
        </PrimaryButton>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#0B3C4F] leading-snug">
            Your money is protected. We hold your payment until the job is done. Cover for this job is included.
          </h1>
          <p className="text-sm font-normal text-[#14232B] mt-2 opacity-70">
            {job ? `${job.title} with ${job.worker.name}. ` : ""}Funds are only released after the job is confirmed.
          </p>
        </div>

        <ErrorNote message={error} />

        {job && !readyToPay(job) && (
          <Card>
            <p className="text-sm text-[#14232B]">
              {job.pendingOffer ? (
                <>
                  {job.pendingOffer.by === "worker" ? `${job.worker.name} proposed` : "You proposed"}{" "}
                  <strong className="text-[#0B3C4F]">{formatNaira(job.pendingOffer.amountKobo)}</strong>. Agree on the
                  price before paying.
                </>
              ) : (
                <>
                  Waiting for {job.worker.name} to accept the price of{" "}
                  <strong className="text-[#0B3C4F]">{formatNaira(job.amountKobo)}</strong>. You can pay once they do.
                </>
              )}
            </p>
            <Link href={`/job/${jobId}`} className="inline-block mt-3 text-sm font-bold text-[#0B3C4F] underline">
              {job.pendingOffer ? "Respond to the offer" : "View the job"}
            </Link>
          </Card>
        )}

        <Card label="Cost breakdown">
          {quote && job ? (
            <div className="space-y-4 mt-3">
              <Row label={`Job cost (paid to ${job.worker.name})`} value={formatNaira(job.amountKobo)} />
              <div className="space-y-2">
                <Row label="Cover & fees" value={formatNaira(quote.premiumKobo + quote.feeKobo)} />
                <div className="pl-3 space-y-1.5 border-l-2 border-[#0B3C4F]/15">
                  <SubRow label="Insurance cover (Curacel)" value={formatNaira(quote.premiumKobo)} />
                  <SubRow label="SureJob service fee" value={formatNaira(quote.feeKobo)} />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-baseline">
                <span className="text-base font-bold text-[#0B3C4F]">Total</span>
                <span className="text-3xl font-bold text-[#0B3C4F]">{formatNaira(quote.totalKobo)}</span>
              </div>
            </div>
          ) : (
            !error && job && readyToPay(job) && <p className="text-sm opacity-60 mt-2">Getting your cover quote…</p>
          )}
        </Card>

        {job?.worker.onPlatform && !job.pendingOffer && (
          <div className="text-center">
            <Link href={`/job/${jobId}`} className="text-sm font-bold text-[#0B3C4F] hover:underline">
              Want a different price? Negotiate with {job.worker.name}.
            </Link>
          </div>
        )}

        {quote && quote.coverage.length > 0 && (
          <Card label="What the cover includes">
            <ul className="mt-2 space-y-1.5 text-sm text-[#14232B]">
              {quote.coverage.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs font-normal text-[#14232B] opacity-80">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
      <span>{label}</span>
      <span className="font-bold text-[#0B3C4F]">{value}</span>
    </div>
  );
}
