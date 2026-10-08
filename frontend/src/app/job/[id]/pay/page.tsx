"use client";

import React, { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, formatNaira, getJob, getQuote, payEscrow, type Job, type Quote } from "@/api";

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

        <Card label="Cost breakdown">
          {quote && job ? (
            <div className="space-y-4 mt-3">
              <Row label="Job cost" value={formatNaira(job.amountKobo)} />
              <Row label="Cover cost" value={formatNaira(quote.premiumKobo)} />
              <div className="pt-4 flex justify-between items-baseline">
                <span className="text-base font-bold text-[#0B3C4F]">Total</span>
                <span className="text-3xl font-bold text-[#0B3C4F]">{formatNaira(quote.totalKobo)}</span>
              </div>
            </div>
          ) : (
            !error && <p className="text-sm opacity-60 mt-2">Getting your cover quote…</p>
          )}
        </Card>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm font-normal text-[#14232B]">
      <span>{label}</span>
      <span className="font-bold text-[#0B3C4F]">{value}</span>
    </div>
  );
}
