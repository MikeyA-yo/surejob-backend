import React from "react";
import Link from "next/link";
import { Play, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function HeroCopy() {
  return (
    <div className="relative max-w-4xl mx-auto text-center px-4 pt-10 sm:pt-16 pb-6">
      {/* Announcement Trust Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5EFE3] border border-[#E8E1D3] text-[#1E3A2B] text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-[#1E3A2B]" />
        <span>Decentralized Escrow for Artisans & Customers</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B]" />
        <span className="text-[#4F6156] font-normal hidden sm:inline">Zero payment disputes</span>
      </div>

      {/* Massive Editorial Serif Headline */}
      <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1E3A2B] tracking-tight leading-[1.08] mb-6">
        Trust in every job. <br className="hidden sm:inline" />
        <span className="relative inline-block text-[#1E3A2B]">
          Guaranteed.
          {/* Subtle warm accent underline */}
          <span className="absolute -bottom-2 left-0 right-0 h-1.5 bg-[#1E3A2B]/20 rounded-full" />
        </span>
      </h1>

      {/* Jargon-free Warm Sub-headline */}
      <p className="text-lg sm:text-xl md:text-2xl text-[#4F6156] max-w-2xl mx-auto font-normal leading-relaxed mb-8">
        Secure escrow payments, built-in insurance, and instant bankless payouts for the informal service economy.
      </p>

      {/* Centered Pill Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-8">
        {/* Primary Solid Forest Green Pill Button */}
        <Link
          href="#book-job"
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 text-base font-bold text-white bg-[#1E3A2B] hover:bg-[#14291E] active:scale-[0.98] rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Book a Job</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Secondary Outlined Forest Green Pill Button */}
        <Link
          href="#watch-demo"
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 text-base font-bold text-[#1E3A2B] bg-white hover:bg-[#F5EFE3] border-2 border-[#1E3A2B] active:scale-[0.98] rounded-full shadow-2xs transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#1E3A2B]/10 flex items-center justify-center text-[#1E3A2B] group-hover:bg-[#1E3A2B] group-hover:text-white transition-colors">
            <Play className="w-3 h-3 fill-current ml-0.5" />
          </div>
          <span>Watch Demo</span>
        </Link>
      </div>

      {/* Quick Trust Highlights */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[#4F6156] pt-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#1E3A2B]" />
          <span>No bank app required</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#1E3A2B]" />
          <span>Full milestone protection</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#1E3A2B]" />
          <span>Instant USSD OTP payout</span>
        </div>
      </div>
    </div>
  );
}
