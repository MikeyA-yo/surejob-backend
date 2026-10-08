"use client";

import React from "react";
import { 
  SunMedium, 
  Wrench, 
  Hammer, 
  Cog, 
  ArrowUpRight 
} from "lucide-react";

export default function TradesSection() {
  const trades = [
    {
      title: "Solar & Inverter Power",
      description: "Safeguard ₦150,000 to ₦3,000,000 installations. Release funds in phases: mounting, battery cabling, and full load test.",
      icon: SunMedium,
      stat: "₦120M+ protected in solar jobs",
    },
    {
      title: "Plumbing & Boreholes",
      description: "Water pumping machines, submersible borehole pumps, and plumbing piping. Never let an artisan run off with parts cash.",
      icon: Wrench,
      stat: "Zero parts cash diversion",
    },
    {
      title: "Carpentry & Aluminum",
      description: "Kitchen cabinets, wardrobe framing, roofing sheets, and aluminum doors. Funds release only when physical woodwork arrives.",
      icon: Hammer,
      stat: "Inspected before final balance",
    },
    {
      title: "Generators & Mechanics",
      description: "Lister diesel generators, soundproof sets, and vehicle engine repairs. Pay parts suppliers and labor on separate milestones.",
      icon: Cog,
      stat: "Verified labor & genuine parts",
    },
  ];

  return (
    <div id="trades" className="bg-primary/4 border-b border-border/40 py-24 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
          Trades We Protect
        </strong>

        {/* Heading */}
        <h2 className="mt-5 max-w-4xl mx-auto text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
          Everyday Trades Where Every Single Naira Is Guaranteed
        </h2>

        {/* Subtitle */}
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
          Whether you’re commissioning an emergency repair or a major home upgrade, Surejob keeps all parties protected.
        </p>

        {/* 4 Cards Grid (HomeGuardian Frame Style) */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {trades.map((trade, idx) => {
            const Icon = trade.icon;
            return (
              <div key={idx} className="rounded-xl border border-border bg-muted/70 p-1.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="relative px-6 py-9 bg-card rounded-lg border border-border/80 h-full overflow-hidden flex flex-col justify-between group">
                  {/* Subtle Tech Grid Mask */}
                  <div className="absolute inset-0 tech-grid-card pointer-events-none z-0 opacity-60" />

                  <div className="relative z-10 flex flex-col">
                    <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-transform">
                      <Icon className="size-8 text-primary stroke-[1.75px]" />
                    </div>

                    <h3 className="text-xl font-semibold text-foreground tracking-tight">
                      {trade.title}
                    </h3>

                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {trade.description}
                    </p>

                    <div className="mt-5 inline-block text-[11px] font-semibold text-primary bg-primary/8 px-2.5 py-1 rounded-full w-fit">
                      {trade.stat}
                    </div>
                  </div>

                  <div className="relative z-10 mt-8 pt-4 border-t border-border/60">
                    <a
                      href="#cta"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-[#162E22] h-9 px-4 py-2 w-full shadow-2xs"
                    >
                      Book for This Trade <ArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
