"use client";

import React from "react";
import { ArrowRight, ShieldCheck, CheckCircle2, Lock } from "lucide-react";

export default function CTASection() {
  return (
    <section id="cta" className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
      <div className="relative overflow-hidden border border-border rounded-2xl bg-gradient-to-b from-primary/10 via-card to-card p-8 sm:p-14 text-center shadow-md">
        {/* Tech Grid Mask Background */}
        <div className="absolute inset-0 tech-grid-hero pointer-events-none opacity-60" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20 mb-6">
            <Lock className="size-3" />
            <span>Guaranteed by Ecobank Trustee Escrow</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tighter text-[#14232B] text-balance leading-tight">
            Never Lose Another Naira to Artisan Stories or Abandoned Jobs
          </h2>

          {/* Subtext */}
          <p className="mt-5 text-base sm:text-lg text-muted-foreground text-balance">
            Whether you’re fixing a leaking pipe, setting up a solar inverter, or building custom furniture — lock your payment in escrow and get the job done right.
          </p>

          {/* Dual Pill Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/book"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all bg-primary text-primary-foreground hover:bg-[#162E22] h-12 px-8 text-base shadow-sm group"
            >
              Fund a Job with Escrow
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button
              type="button"
              onClick={() => alert("Starting artisan onboarding...")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all border border-border bg-card shadow-xs hover:bg-accent text-foreground h-12 px-8 text-base"
            >
              <CheckCircle2 className="size-4 text-primary" />
              Join as a Verified Artisan
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 pt-8 border-t border-border/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> 100% Refundable if Worker Defaults
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-4 text-primary" /> CBN-Regulated Escrow Custody
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" /> Instant Bankless USSD Cashout
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
