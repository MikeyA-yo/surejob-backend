"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Camera, 
  PhoneCall, 
  Sparkles,
  Check,
  Building2,
  BadgeCheck,
  RotateCcw
} from "lucide-react";

export default function HeroSection() {
  const [milestone2Approved, setMilestone2Approved] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "artisan">("client");

  return (
    <div className="relative bg-primary/4 overflow-hidden border-b border-border/40">
      {/* Background Tech Grid Mask (HomeGuardian Signature Style) */}
      <div className="absolute inset-0 -z-10 tech-grid-hero pointer-events-none opacity-70" />

      <div className="min-h-[calc(100svh-5rem)] py-16 sm:py-20 max-w-7xl mx-auto text-center px-6">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-xs">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <span>Nigeria’s First Milestone Escrow for Informal Trades</span>
        </div>

        {/* High-Impact Heading */}
        <h1 className="mt-6 max-w-4xl mx-auto text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08] font-bold tracking-tighter text-balance text-[#14232B]">
          Trust in Every Job. <br className="hidden sm:inline" />
          <span className="text-[#1E3A2B]">Guaranteed by Escrow.</span>
        </h1>

        {/* Balanced Subtitle */}
        <div className="mt-6 max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground text-balance">
          <p>
            Never lose money to artisans who vanish or deliver sloppy work. Funds stay securely locked in 
            CBN-licensed custody and are released milestone-by-milestone only when you inspect and approve.
          </p>
        </div>

        {/* Dual Pill CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all bg-primary text-primary-foreground hover:bg-[#162E22] h-12 px-8 text-base shadow-sm group"
          >
            Lock Funds for a Job
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all border border-border bg-card shadow-xs hover:bg-accent text-foreground h-12 px-8 text-base"
          >
            <ShieldCheck className="size-4 text-primary" />
            See How Escrow Protects You
          </a>
        </div>

        {/* Role Switcher Pill */}
        <div className="mt-10 inline-flex items-center p-1 bg-card rounded-full border border-border shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("client")}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
              activeTab === "client"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            For Homeowners & Clients
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("artisan")}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
              activeTab === "artisan"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            For Handymen & Tradesmen
          </button>
        </div>

        {/* Hero Visual Container (HomeGuardian Framed Style) */}
        <div className="mt-14 sm:mt-18 border border-border rounded-xl bg-muted/80 p-2 sm:p-3 shadow-md max-w-5xl mx-auto">
          <div className="bg-card rounded-lg border border-border relative overflow-hidden text-left p-4 sm:p-7">
            {/* Inner Tech Grid Mask */}
            <div className="absolute inset-0 z-0 tech-grid-hero pointer-events-none opacity-50" />

            {/* Dashboard Content */}
            <div className="relative z-10 space-y-6">
              {/* Top Contract Meta Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0 border border-primary/20">
                    BA
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base">Babatunde Adeyemi</span>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <BadgeCheck className="size-3 text-emerald-600" /> NIN Verified
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solar & Electrical Engineer • 4.9 ★ (124 Completed Escrows) • Lekki, Lagos
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="px-3 py-1 rounded-full bg-primary/8 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1.5">
                    <Lock className="size-3" />
                    Contract #SJ-8821
                  </div>
                  <div className="px-3.5 py-1.5 rounded-lg bg-[#1E3A2B] text-white text-xs font-semibold shadow-xs">
                    ₦45,000 Locked in Escrow
                  </div>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="bg-primary/5 rounded-lg border border-primary/15 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <span className="text-foreground/90">
                    {activeTab === "client" ? (
                      <strong>Client Protection Active:</strong>
                    ) : (
                      <strong>Artisan Guarantee Active:</strong>
                    )}{" "}
                    Funds are secured by Ecobank Custody Trustee. Payout is released once verified.
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-primary shrink-0">
                  <Building2 className="size-3.5" /> NDIC Partner Insured
                </div>
              </div>

              {/* 3 Milestone Progress Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Milestone 1: Completed */}
                <div className="bg-card rounded-lg border border-border p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Milestone 1
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="size-3" /> Paid (₦15,000)
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">Inverter Mounting & DC Breaker</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Wall brackets drilled, inverter secured, and DC surge arrester installed.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Approved by Client</span>
                    <span className="font-mono text-emerald-700 font-medium">OTP: 772-910</span>
                  </div>
                </div>

                {/* Milestone 2: Active / Actionable */}
                <div className="bg-gradient-to-b from-primary/5 to-card rounded-lg border-2 border-primary/30 p-4 flex flex-col justify-between shadow-xs relative">
                  <div className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Ready for Approval
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Milestone 2
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        ₦20,000 Held
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">4x 200Ah Battery Cabling</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rack assembled, 25mm pure copper interlinks bolted, terminal covers fixed.
                    </p>

                    {/* Evidence Photos */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium bg-primary/8 p-2 rounded-md">
                      <Camera className="size-3.5" />
                      <span>3 Timestamped Photos Uploaded</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80">
                    {milestone2Approved ? (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md p-2 text-xs font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-600" /> Funds Released!
                        </span>
                        <span className="font-mono font-bold">₦20,000 PAID</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMilestone2Approved(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-[#162E22] py-2 px-3 rounded-full text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Check className="size-3.5" /> Approve & Release
                        </button>
                        <button
                          type="button"
                          onClick={() => alert("Inspection requested. Babatunde has been notified on WhatsApp.")}
                          className="px-3 py-2 rounded-full border border-border text-foreground hover:bg-accent text-xs font-medium"
                          title="Request correction"
                        >
                          <RotateCcw className="size-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone 3: Pending */}
                <div className="bg-muted/40 rounded-lg border border-border p-4 flex flex-col justify-between opacity-80">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Milestone 3
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        ₦10,000 Locked
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">Solar Load Test & Handover</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full daytime solar charging verification, test fridge/pumping machine load.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Lock className="size-3 text-muted-foreground" /> Locked in Custody
                    </span>
                    <span>Pending M2 completion</span>
                  </div>
                </div>
              </div>

              {/* Bottom Feature Strip (Bankless USSD + Zero No-Show Risk) */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <PhoneCall className="size-4 text-primary" />
                  <span>
                    Worker USSD Payout Code: <strong className="font-mono text-foreground">*384*8821#</strong> (No smartphone required)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>100% Client Refund if Artisan Defaults</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
