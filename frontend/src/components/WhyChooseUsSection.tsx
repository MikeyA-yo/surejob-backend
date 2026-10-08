"use client";

import React from "react";
import { 
  ShieldCheck, 
  Smartphone, 
  Scale, 
  ArrowUpRight, 
  Building2, 
  CreditCard, 
  Landmark, 
  CheckCircle2, 
  Fingerprint 
} from "lucide-react";

export default function WhyChooseUsSection() {
  const cards = [
    {
      icon: ShieldCheck,
      title: "100% Milestone Escrow",
      description: "Funds are locked in CBN-licensed custody before work starts. Artisans work with total confidence, and you only release cash after verifying quality.",
    },
    {
      icon: Smartphone,
      title: "Bankless USSD Payouts",
      description: "Artisans don't need expensive smartphones or network apps on-site. Approved payouts trigger instant USSD redemption codes on any basic phone.",
    },
    {
      icon: Scale,
      title: "Fast 2-Hour Mediation",
      description: "Mandatory before-and-after photo evidence protects both sides. If an artisan defaults or abandons a site, your remaining funds are refunded.",
    },
  ];

  const partners = [
    {
      name: "Ecobank Trustee",
      role: "CBN Custodial Escrow",
      icon: Landmark,
    },
    {
      name: "Paystack",
      role: "Secure Card & Transfer Rail",
      icon: CreditCard,
    },
    {
      name: "NIBSS NIP",
      role: "Instant Bank Settlement",
      icon: Building2,
    },
    {
      name: "Interswitch",
      role: "USSD & POS Cashout Network",
      icon: CheckCircle2,
    },
    {
      name: "NIMC Identity",
      role: "NIN Artisan Verification",
      icon: Fingerprint,
    },
  ];

  return (
    <section id="why-choose-us" className="max-w-7xl mx-auto px-6 text-center py-24 sm:py-28 border-b border-border/40">
      {/* Section Eyebrow */}
      <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
        Why Choose Surejob
      </strong>

      {/* Main Headline */}
      <h2 className="mt-5 max-w-4xl mx-auto text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
        We Eliminate Payment Anxiety Between Clients & Informal Trades
      </h2>

      {/* Subtitle */}
      <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
        Over 85% of artisan conflicts in Nigeria happen over upfront deposits. We built the fair bridge where both parties win.
      </p>

      {/* 3 Bento Feature Cards (HomeGuardian Style) */}
      <div className="mt-14 flex flex-wrap gap-6 justify-center">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="relative overflow-hidden border border-border rounded-xl px-7 py-12 w-full sm:max-w-xs md:max-w-sm flex flex-col items-center text-center gap-3 bg-gradient-to-b from-primary/5 via-card to-card shadow-xs group hover:border-primary/40 transition-all hover:-translate-y-1"
            >
              {/* HomeGuardian Card Tech Grid Background */}
              <div className="absolute inset-0 tech-grid-card pointer-events-none -z-0 opacity-80" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                  <Icon className="size-11 stroke-[1.5px] text-primary" />
                </div>

                <h3 className="mt-4 text-xl font-semibold text-foreground tracking-tight">
                  {card.title}
                </h3>

                <p className="mt-3 text-sm text-muted-foreground text-balance leading-relaxed">
                  {card.description}
                </p>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-[#162E22] h-9 px-5 py-2 mt-7 shadow-2xs"
                >
                  Learn More <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Social Proof / Partner Rail Grid (HomeGuardian Style) */}
      <div className="mt-28 space-y-8">
        <div className="space-y-2">
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Backed by Licensed Banking Rails & Identity Verification
          </p>
          <p className="text-sm text-muted-foreground">
            Your money is never handled informally. All custody accounts operate within regulated Nigerian financial infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-primary/5 rounded-xl border border-dashed border-primary/20 p-2 max-w-6xl mx-auto">
          {partners.map((partner, idx) => {
            const PartnerIcon = partner.icon;
            return (
              <div
                key={idx}
                className="bg-card h-28 border border-dashed border-border rounded-lg flex flex-col items-center justify-center px-4 hover:border-primary/50 transition-colors"
              >
                <PartnerIcon className="size-6 text-primary mb-2 opacity-85" />
                <span className="font-bold text-xs sm:text-sm text-foreground tracking-tight text-center">
                  {partner.name}
                </span>
                <span className="text-[11px] text-muted-foreground text-center mt-0.5 line-clamp-1">
                  {partner.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
