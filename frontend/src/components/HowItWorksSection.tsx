"use client";

import React, { useState } from "react";
import { 
  Lock, 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Smartphone,
  Sparkles
} from "lucide-react";

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Set Milestones & Lock Funds",
      subtitle: "Never pay 100% upfront",
      description: "Agree on the job scope with your artisan and break the cost into milestones (e.g. 30% on material delivery, 40% on piping/installation, 30% on handover). Deposit the total into licensed escrow.",
      icon: Lock,
      highlight: "Ecobank Custody Trustee Protected",
    },
    {
      num: "02",
      title: "Artisan Works with Certainty",
      subtitle: "Work begins without friction",
      description: "The artisan receives an SMS notification confirming funds are 100% locked. They work enthusiastically knowing payment is guaranteed. When done, they submit timestamped proof photos.",
      icon: Camera,
      highlight: "Timestamped Photo Verification",
    },
    {
      num: "03",
      title: "Inspect & Release Instant Payout",
      subtitle: "You stay in complete control",
      description: "You inspect the completed milestone. If satisfied, you tap 'Release Payout' or share the 6-digit OTP code. The artisan immediately cashes out via direct bank transfer, USSD, or POS agent.",
      icon: CheckCircle2,
      highlight: "Bankless USSD (*384#) Available",
    },
  ];

  return (
    <section id="how-it-works" className="bg-primary/4 border-b border-border/40 py-24 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
          How It Works
        </strong>

        <h2 className="mt-5 max-w-4xl mx-auto text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
          Three Simple Steps to Zero-Risk Artisan Hires
        </h2>

        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
          Designed specifically for Nigeria’s everyday informal economy. No complicated paperwork, no banking delays.
        </p>

        {/* 3 Step Cards in HomeGuardian Style */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer rounded-xl border transition-all p-1.5 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="relative p-7 bg-card rounded-lg border border-border/80 h-full overflow-hidden flex flex-col justify-between">
                  <div className="absolute inset-0 tech-grid-card pointer-events-none opacity-40" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-mono text-3xl font-extrabold text-primary/40">
                        {step.num}
                      </span>
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="size-6 text-primary" />
                      </div>
                    </div>

                    <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                      {step.subtitle}
                    </div>

                    <h3 className="text-xl font-bold text-foreground tracking-tight">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      {step.highlight}
                    </span>
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dispute Guarantee Callout */}
        <div className="mt-12 bg-card rounded-xl border border-border p-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-left shadow-2xs">
          <div className="size-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-base">
              What if the artisan doesn't show up or does a bad job?
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              Because funds are never given directly to the worker in advance, our 2-hour mediation desk steps in with timestamped photos. If the worker defaulted, 100% of the milestone balance is returned to your account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
