"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What happens if the artisan takes my deposit and never shows up?",
      a: "With Surejob, the artisan never receives upfront cash. Your money is held in a CBN-licensed custody account. If the artisan fails to arrive or cancels, our 2-hour dispute window verifies the no-show and returns 100% of your money back to your account.",
    },
    {
      q: "Does the artisan need a smartphone or bank app on-site?",
      a: "No! We engineered Surejob specifically for the informal Nigerian trades. When you release a milestone, the worker receives an SMS with a USSD redemption code (*384#) or OTP. They can cash out at any local POS terminal, Momo agent, or direct to their bank.",
    },
    {
      q: "How are disputes resolved if the work is poor or incomplete?",
      a: "Both parties agree to the scope before funding. The artisan submits timestamped before-and-after photos of their work. If there is a disagreement, our dedicated 2-hour mediation team reviews the photo evidence and specifications to make a fair, legally compliant determination.",
    },
    {
      q: "What are the fees for using Surejob escrow?",
      a: "We charge a transparent 2.5% escrow fee on funded transactions, capped at ₦5,000. There are zero hidden deductions for the worker, and dispute mediation is included at no extra cost.",
    },
    {
      q: "Where is my money held while the job is in progress?",
      a: "Your funds are securely held in dedicated trustee custody accounts managed with Ecobank and CBN-licensed partner financial institutions. Surejob never uses customer escrow deposits for operational expenses.",
    },
    {
      q: "Can I customize the milestones for my specific job?",
      a: "Yes! You and your artisan can create anywhere from 1 to 5 milestones. For example: 30% on material delivery, 40% on pipe installation, and 30% on final pressure testing.",
    },
  ];

  return (
    <section id="faq" className="max-w-4xl mx-auto px-6 py-24 sm:py-28 border-b border-border/40">
      <div className="text-center">
        <strong className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
          Got Questions?
        </strong>

        <h2 className="mt-5 text-4xl sm:text-5xl leading-[1.1] font-bold tracking-tighter text-balance text-[#14232B]">
          Frequently Asked Questions
        </h2>

        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto text-balance">
          Everything you need to know about how milestone escrow works for informal jobs in Nigeria.
        </p>
      </div>

      {/* Accordion List */}
      <div className="mt-14 space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-semibold text-foreground text-base sm:text-lg hover:text-primary transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`size-5 text-primary shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
