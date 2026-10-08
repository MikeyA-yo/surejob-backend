"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ErrorNote } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, formatNaira, listMyJobs, type Job } from "@/api";
import { jobHref, STATUS_LABELS } from "@/lib/jobStatus";

export default function MyJobsScreen() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listMyJobs()
      .then((list) => active && setJobs(list))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [user]);

  const isCustomer = user?.role === "customer";

  return (
    <AppShell
      bottomAction={
        isCustomer ? (
          <Link
            href="/book"
            className="w-full h-12 bg-[#0B3C4F] text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Book a job
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3C4F]">My jobs</h1>
          <p className="text-sm text-[#14232B] mt-1 opacity-70">
            {isCustomer ? "Jobs you've booked." : "Jobs you've been booked for."}
          </p>
        </div>

        <ErrorNote message={error} />
        {!jobs && !error && <p className="text-sm opacity-60">Loading…</p>}
        {jobs?.length === 0 && (
          <p className="text-sm opacity-70">{isCustomer ? "No jobs yet. Book your first one below." : "No jobs yet."}</p>
        )}

        <div className="space-y-3">
          {jobs?.map((job) => (
            <Link key={job.id} href={jobHref(job)} className="block bg-[#EEF4F6] rounded-xl p-5 hover:opacity-90">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B3C4F]">{job.title}</h2>
                  <p className="text-sm text-[#14232B] opacity-70 mt-0.5">
                    {job.you === "customer" ? `Worker: ${job.worker.name}` : `Customer: ${job.customer.name}`}
                    {!job.worker.onPlatform && " · not on SureJob"}
                  </p>
                </div>
                <span className="text-base font-bold text-[#0B3C4F] whitespace-nowrap">{formatNaira(job.amountKobo)}</span>
              </div>
              <span className="inline-block mt-3 text-xs font-bold text-[#0B3C4F] bg-white px-2.5 py-1 rounded-full">
                {STATUS_LABELS[job.status]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
