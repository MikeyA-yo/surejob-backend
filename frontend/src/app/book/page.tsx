"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, Field, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { createJob, errorMessage, listWorkers, type CreateJobParams, type WorkerSummary } from "@/api";

/** Value of the "worker not on SureJob" choice in the worker picker. */
const NEW_WORKER = "__new__";

export default function BookScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [workers, setWorkers] = useState<WorkerSummary[] | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [title, setTitle] = useState("Brake repair");
  const [amountNaira, setAmountNaira] = useState("15000");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTrade, setNewTrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "customer") return;
    let active = true;
    listWorkers()
      .then((list) => {
        if (!active) return;
        setWorkers(list);
        setChoice((current) => current || list[0]?.id || NEW_WORKER);
      })
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [user]);

  const handleBook = async () => {
    setError(null);
    const amountKobo = Math.round(Number(amountNaira) * 100);
    if (!title.trim()) return setError("Describe the job.");
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) return setError("Enter the job price in naira.");
    if (!choice) return setError("Choose a worker.");

    const params: CreateJobParams =
      choice === NEW_WORKER
        ? {
            title: title.trim(),
            amountKobo,
            newWorker: { name: newName.trim(), phone: newPhone.trim(), ...(newTrade.trim() ? { trade: newTrade.trim() } : {}) },
          }
        : { title: title.trim(), amountKobo, workerId: choice };
    if (params.newWorker && (!params.newWorker.name || !params.newWorker.phone)) {
      return setError("Enter the worker's name and phone number.");
    }

    setBusy(true);
    try {
      const job = await createJob(params);
      router.push(`/job/${job.id}/pay`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (user && user.role !== "customer") {
    return (
      <AppShell backHref="/jobs">
        <Card>
          <p className="text-sm">Only customers can book jobs. Your bookings appear under My jobs.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      backHref="/jobs"
      bottomAction={
        <PrimaryButton onClick={handleBook} busy={busy}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3C4F]">Book Service</h1>
          <p className="text-sm font-normal text-[#14232B] mt-1 opacity-70">Describe the job and choose who does it.</p>
        </div>

        <Field id="title" label="Service" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Field
          id="amount"
          label="Price (₦)"
          type="number"
          inputMode="numeric"
          min={1}
          value={amountNaira}
          onChange={(e) => setAmountNaira(e.target.value)}
        />

        <div>
          <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">Worker</span>
          {!workers && !error && <p className="text-sm opacity-60">Loading workers…</p>}
          <div className="space-y-2" role="radiogroup">
            {workers?.map((w) => (
              <WorkerOption
                key={w.id}
                selected={choice === w.id}
                onSelect={() => setChoice(w.id)}
                title={w.name}
                subtitle={`${w.trade ? capitalize(w.trade) : "Worker"} · Verified on SureJob`}
              />
            ))}
            <WorkerOption
              selected={choice === NEW_WORKER}
              onSelect={() => setChoice(NEW_WORKER)}
              title="Someone not on SureJob"
              subtitle="Add your own worker. They get paid by cash code on their phone."
            />
          </div>
        </div>

        {choice === NEW_WORKER && (
          <div className="space-y-4">
            <Field id="new-name" label="Worker's name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Musa" />
            <Field
              id="new-phone"
              label="Worker's phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+234 803 000 0000"
            />
            <Field id="new-trade" label="Trade (optional)" value={newTrade} onChange={(e) => setNewTrade(e.target.value)} placeholder="e.g. plumber" />
            <p className="text-xs text-[#14232B] opacity-70">
              Because they don&apos;t have an account, your confirmation releases their payout, and you&apos;ll see the cash code to pass on.
            </p>
          </div>
        )}

        <ErrorNote message={error} />
      </div>
    </AppShell>
  );
}

function WorkerOption({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-4 transition-colors ${
        selected ? "bg-[#0B3C4F] text-white" : "bg-[#EEF4F6] text-[#14232B]"
      }`}
    >
      <span className="block text-base font-bold">{title}</span>
      <span className={`block text-sm mt-0.5 ${selected ? "opacity-80" : "opacity-70"}`}>{subtitle}</span>
    </button>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
