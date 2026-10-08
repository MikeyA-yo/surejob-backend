"use client";

import React from "react";
import { Star, Quote, ShieldCheck } from "lucide-react";

export default function TestimonialsSection() {
  const reviews = [
    {
      name: "Dr. Nneka Eze",
      role: "Homeowner • Victoria Island, Lagos",
      service: "5kVA Solar Inverter Setup (₦850,000)",
      comment:
        "In the past, an electrician took ₦300k upfront for solar panels and disappeared for 3 weeks. With Surejob, I locked the total in escrow. The technician worked fast and clean knowing his money was guaranteed upon load testing. Zero stress.",
      stars: 5,
    },
    {
      name: "Emeka Okafor",
      role: "Certified Electrician • Ikeja Computer Village",
      service: "Artisan on Surejob (48 Escrows Completed)",
      comment:
        "As an artisan, clients used to delay my balance for months after I finished. With Surejob, I see the funds locked in custody before I touch any tool. The moment the client enters the release OTP, my bank account gets credited instantly.",
      stars: 5,
    },
    {
      name: "Alhaji Garba Bello",
      role: "Property Owner • Maitama, Abuja",
      service: "Commercial Borehole Pump Replacement (₦320,000)",
      comment:
        "Our estate borehole pump failed. We hired a specialist and funded two milestones: pump extraction and motor replacement. When water started pumping, we released the final code. No endless excuses, complete accountability.",
      stars: 5,
    },
  ];

  return (
    <section id="testimonials" className="max-w-7xl mx-auto px-6 text-center py-24 sm:py-28 border-b border-border/40">
      <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
        Verified Reviews
      </strong>

      <h2 className="mt-5 max-w-4xl mx-auto text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
        Loved by Homeowners, Respected by Honest Artisans
      </h2>

      <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
        Over 14,000 informal jobs safeguarded across Lagos, Abuja, and Port Harcourt.
      </p>

      {/* 3 Review Cards */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {reviews.map((rev, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-7 shadow-xs flex flex-col justify-between relative hover:border-primary/40 transition-colors"
          >
            <div>
              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-4 text-amber-500">
                {[...Array(rev.stars)].map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Service Chip */}
              <div className="inline-block text-[11px] font-semibold text-primary bg-primary/8 px-2.5 py-1 rounded-full mb-4">
                {rev.service}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                "{rev.comment}"
              </p>
            </div>

            {/* Author */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground">{rev.name}</h4>
                <p className="text-xs text-muted-foreground">{rev.role}</p>
              </div>
              <ShieldCheck className="size-5 text-primary opacity-80" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
