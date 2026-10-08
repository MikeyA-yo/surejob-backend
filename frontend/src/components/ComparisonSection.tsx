"use client";

import React from "react";
import { Check, X, ShieldCheck } from "lucide-react";

export default function ComparisonSection() {
  const rows = [
    {
      feature: "Upfront Payment Safety",
      surejob: "100% Locked in CBN-Licensed Custody",
      directCash: "High risk of artisan fleeing with cash",
      whatsapp: "Zero deposit protection or recourse",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
    {
      feature: "Milestone Inspection Proof",
      surejob: "Mandatory timestamped photos & client OTP",
      directCash: "No verification; money gone once sent",
      whatsapp: "Informal promises that get broken",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
    {
      feature: "Worker Payment Certainty",
      surejob: "Artisans see locked funds before starting",
      directCash: "Frequent client refusal to pay balance",
      whatsapp: "Endless haggling after job is done",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
    {
      feature: "Bankless Cashout on Site",
      surejob: "Instant USSD (*384#) or any local POS agent",
      directCash: "Requires bank apps and good network",
      whatsapp: "Manual transfer delays",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
    {
      feature: "Fast Dispute Resolution",
      surejob: "Dedicated 2-hour mediation desk + refunds",
      directCash: "Street quarrels or police stations",
      whatsapp: "Artisan blocks you on WhatsApp",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
    {
      feature: "Partner Workmanship Insurance",
      surejob: "Leadway Assurance coverage on qualified jobs",
      directCash: "No warranty or insurance",
      whatsapp: "No warranty",
      surejobOk: true,
      directOk: false,
      whatsappOk: false,
    },
  ];

  return (
    <section id="comparison" className="max-w-7xl mx-auto px-6 text-center py-24 sm:py-28 border-b border-border/40">
      <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
        The Escrow Advantage
      </strong>

      <h2 className="mt-5 max-w-4xl mx-auto text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
        Experience the Difference with Surejob
      </h2>

      <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
        See how our automated milestone escrow transforms the chaotic informal job experience into a predictable, secure standard.
      </p>

      {/* HomeGuardian Framed Dashed Table Container */}
      <div className="mt-14 border border-dashed border-primary/25 p-2 bg-muted/60 rounded-xl max-w-6xl mx-auto shadow-xs">
        <div className="relative w-full overflow-x-auto">
          <table className="w-full text-sm bg-card rounded-lg overflow-hidden border border-border">
            <thead>
              <tr className="border-b border-dashed border-border/80 text-base [&>th]:py-5 [&>th]:px-4 [&>th]:border-r [&>th]:border-dashed [&>th]:border-border/80 last:[&>th]:border-r-0">
                <th className="text-left font-semibold text-muted-foreground w-1/4 bg-muted/30 pl-6">
                  Feature / Guarantee
                </th>
                <th className="text-center font-bold text-primary bg-primary/8 w-1/4">
                  <div className="inline-flex items-center gap-1.5 text-base">
                    <ShieldCheck className="size-5 text-primary" />
                    Surejob Escrow
                  </div>
                </th>
                <th className="text-center font-medium text-foreground/80 w-1/4 bg-muted/20">
                  Direct Cash / Transfer
                </th>
                <th className="text-center font-medium text-foreground/80 w-1/4 bg-muted/20">
                  Classifieds / WhatsApp
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-dashed border-border/80 hover:bg-muted/30 transition-colors [&>td]:py-4.5 [&>td]:px-4 [&>td]:border-r [&>td]:border-dashed [&>td]:border-border/80 last:[&>td]:border-r-0 text-sm"
                >
                  {/* Feature Label */}
                  <td className="text-left font-semibold text-foreground bg-muted/20 pl-6">
                    {row.feature}
                  </td>

                  {/* Surejob Value */}
                  <td className="text-center bg-primary/4 font-medium text-[#1E3A2B]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="size-3.5 stroke-[2.5]" />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-foreground">{row.surejob}</span>
                    </div>
                  </td>

                  {/* Direct Cash Value */}
                  <td className="text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <X className="size-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm">{row.directCash}</span>
                    </div>
                  </td>

                  {/* WhatsApp Value */}
                  <td className="text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <X className="size-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm">{row.whatsapp}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
