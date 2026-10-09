"use client";

import React, { useState } from "react";
import { acceptOffer, declineOffer, errorMessage, formatNaira, offerPrice, type Job } from "@/api";
import { Card, ErrorNote } from "@/components/ui";

/** Bargaining over a BOOKED job's price. Either side proposes; the other accepts, declines or counters. */
export default function PriceNegotiation({ job, onChange }: { job: Job; onChange: (job: Job) => void }) {
  const [amountNaira, setAmountNaira] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = job.pendingOffer;
  const otherName = job.you === "customer" ? job.worker.name : job.customer.name;
  const theirOffer = offer !== null && offer.by !== job.you;

  const run = async (action: () => Promise<Job>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      setAmountNaira("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const amountKobo = Math.round(Number(amountNaira) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) return setError("Enter a price in naira.");
    run(() => offerPrice(job.id, amountKobo));
  };

  const smallButton = "h-10 px-4 rounded-xl text-sm font-bold disabled:opacity-50";

  return (
    <Card label="Price">
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-sm text-[#14232B] opacity-70">Agreed price</span>
        <span className="text-2xl font-bold text-[#0B3C4F]">{formatNaira(job.amountKobo)}</span>
      </div>

      {offer && (
        <div className="mt-4 bg-white rounded-xl p-4">
          <p className="text-sm text-[#14232B]">
            {theirOffer ? (
              <>
                <strong className="text-[#0B3C4F]">{otherName}</strong> proposed{" "}
                <strong className="text-[#0B3C4F]">{formatNaira(offer.amountKobo)}</strong>.
              </>
            ) : (
              <>
                You proposed <strong className="text-[#0B3C4F]">{formatNaira(offer.amountKobo)}</strong>. Waiting for {otherName}.
              </>
            )}
          </p>
          <div className="flex gap-2 mt-3">
            {theirOffer && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => acceptOffer(job.id))}
                className={`${smallButton} bg-[#1B8A5A] text-white`}
              >
                Accept {formatNaira(offer.amountKobo)}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => declineOffer(job.id))}
              className={`${smallButton} bg-[#EEF4F6] text-[#0B3C4F]`}
            >
              {theirOffer ? "Decline" : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={sendOffer} className="mt-4">
        <label htmlFor="offer" className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
          {theirOffer ? "Or counter with (₦)" : offer ? "Change your offer (₦)" : "Propose a different price (₦)"}
        </label>
        <div className="flex gap-2">
          <input
            id="offer"
            type="number"
            inputMode="numeric"
            min={1}
            value={amountNaira}
            onChange={(e) => setAmountNaira(e.target.value)}
            placeholder={String(job.amountKobo / 100)}
            className="flex-1 min-w-0 h-10 px-4 bg-white rounded-xl text-sm text-[#14232B] border-0 outline-none"
          />
          <button type="submit" disabled={busy || !amountNaira} className={`${smallButton} bg-[#0B3C4F] text-white`}>
            {theirOffer ? "Counter" : "Send"}
          </button>
        </div>
      </form>

      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </Card>
  );
}
