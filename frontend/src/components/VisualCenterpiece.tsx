"use client";

import React, { useState } from "react";
import {
  Lock,
  CheckCircle2,
  Clock,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  User,
  Briefcase,
  Star,
  ChevronRight,
  Wifi,
  Battery,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export default function VisualCenterpiece() {
  const [activeRole, setActiveRole] = useState<"customer" | "worker">("customer");
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 pt-4 pb-16 lg:pb-24 overflow-visible">
      {/* Soft Warm Radial Glow Behind Phone */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] lg:w-[850px] h-[340px] sm:h-[650px] rounded-full pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(245, 239, 227, 0.9) 0%, rgba(250, 245, 236, 0.4) 50%, rgba(250, 245, 236, 0) 75%)",
        }}
      />

      {/* Main Container */}
      <div className="relative flex flex-col items-center justify-center">

        {/* ========================================================
            DESKTOP FLOATING CARDS (lg screens)
           ======================================================== */}

        {/* Floating Card 1 (Top Left): Role Switcher */}
        <div className="hidden lg:block absolute left-4 xl:left-8 top-12 z-20 animate-float-slow">
          <div className="w-72 bg-white rounded-2xl p-4 shadow-lg shadow-[#1E3A2B]/5 border border-[#E8E1D3] hover:border-[#1E3A2B]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4F6156]">
                Select Role
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1E3A2B] bg-[#F5EFE3] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B]" />
                Live Mode
              </span>
            </div>

            {/* Pill Toggle */}
            <div className="p-1 bg-[#FAF5EC] rounded-xl flex items-center">
              <button
                type="button"
                onClick={() => setActiveRole("customer")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeRole === "customer"
                    ? "bg-[#1E3A2B] text-white shadow-sm"
                    : "text-[#1E3A2B]/70 hover:text-[#1E3A2B]"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRole("worker")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeRole === "worker"
                    ? "bg-[#1E3A2B] text-white shadow-sm"
                    : "text-[#1E3A2B]/70 hover:text-[#1E3A2B]"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Artisan</span>
              </button>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E8E1D3]/60 flex items-center justify-between text-xs text-[#4F6156]">
              <span>{activeRole === "customer" ? "Protected by 100% Escrow" : "Instant Bankless Payout"}</span>
              <span className="font-semibold text-[#1E3A2B] flex items-center gap-0.5">
                Active <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Floating Card 2 (Bottom Left): Escrow Secured N15,000 */}
        <div className="hidden lg:block absolute left-2 xl:left-6 bottom-14 z-20 animate-float-reverse">
          <div className="w-80 bg-white rounded-2xl p-4 shadow-lg shadow-[#1E3A2B]/5 border border-[#E8E1D3] hover:border-[#1E3A2B]/30 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFE3] flex items-center justify-center text-[#1E3A2B] shrink-0 border border-[#E8E1D3]">
                <Lock className="w-5 h-5 text-[#1E3A2B]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6156]">
                    Vault Status
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-[#FAF5EC] text-[#1E3A2B] rounded">
                    LOCKED
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#1E3A2B] mt-0.5 font-serif">
                  Escrow Secured: <span className="font-sans font-black">₦15,000</span>
                </div>
                <p className="text-xs text-[#4F6156] mt-1 font-medium leading-tight">
                  Funds held safely in bank-grade reserve until job inspection is approved.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E8E1D3]/60 flex items-center justify-between text-[11px] text-[#4F6156]">
              <span className="flex items-center gap-1 font-semibold text-[#1E3A2B]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2B]" /> Partner Protected
              </span>
              <span className="font-bold text-[#1E3A2B]">100% Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Floating Card 3 (Top Right): Worker Payout Code */}
        <div className="hidden lg:block absolute right-4 xl:right-8 top-14 z-20 animate-float-delayed">
          <div className="w-80 bg-white rounded-2xl p-4 shadow-xl shadow-[#1E3A2B]/6 border border-[#E8E1D3] hover:border-[#1E3A2B]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#1E3A2B]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A2B]">
                  Artisan Payout Code
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#1E3A2B] bg-[#F5EFE3] px-2 py-0.5 rounded-full">
                Active OTP
              </span>
            </div>

            <div className="text-sm font-bold text-[#1E3A2B] font-serif">
              Collect your cash
            </div>
            <p className="text-xs text-[#4F6156] mt-0.5 mb-3">
              Customer releases this 4-digit token to artisan upon job completion.
            </p>

            {/* Payout Code Display (Forest Green, Bold, Spaced) */}
            <div className="bg-[#FAF5EC] border border-[#E8E1D3] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-2xl font-black text-[#1E3A2B] tracking-widest pl-1">
                <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs border border-[#E8E1D3]">4</span>
                <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs border border-[#E8E1D3]">8</span>
                <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs border border-[#E8E1D3]">2</span>
                <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs border border-[#E8E1D3]">9</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 text-[#1E3A2B] hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E8E1D3]"
                title="Copy code"
                aria-label="Copy code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#1E3A2B]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#4F6156]">
              <span>Redeemable via USSD *384#</span>
              <span className="text-[#1E3A2B] font-semibold">Zero Bank App</span>
            </div>
          </div>
        </div>

        {/* Floating Card 4 (Bottom Right): Protection Guarantee */}
        <div className="hidden lg:block absolute right-2 xl:right-6 bottom-14 z-20 animate-float-reverse">
          <div className="w-72 bg-white rounded-2xl p-4 shadow-lg shadow-[#1E3A2B]/5 border border-[#E8E1D3] hover:border-[#1E3A2B]/30 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFE3] border border-[#E8E1D3] flex items-center justify-center text-[#1E3A2B]">
                <Sparkles className="w-5 h-5 text-[#1E3A2B]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#4F6156] uppercase tracking-wider">
                  Instant Release
                </span>
                <div className="text-base font-extrabold text-[#1E3A2B] font-serif">
                  &lt; 30 Seconds
                </div>
              </div>
            </div>
            <div className="mt-2.5 text-xs text-[#4F6156] flex items-center gap-1.5 leading-snug">
              <span className="w-2 h-2 rounded-full bg-[#1E3A2B] shrink-0" />
              Artisan receives funds to mobile wallet or cash agent immediately.
            </div>
          </div>
        </div>


        {/* ========================================================
            CENTERPIECE: MOBILE PHONE FRAME MOCKUP
           ======================================================== */}
        <div className="relative z-10 w-full max-w-[330px] sm:max-w-[350px] transition-transform duration-300 hover:scale-[1.01]">
          {/* Subtle Outer Shadow */}
          <div className="absolute inset-0 bg-[#1E3A2B]/15 rounded-[48px] blur-2xl transform translate-y-4 -z-10" />

          {/* Phone Outer Chassis (Dark forest frame) */}
          <div className="relative rounded-[46px] p-3 bg-gradient-to-b from-[#223B2E] via-[#162B1F] to-[#0E1F15] shadow-2xl border-[4px] border-[#2E4839]">
            
            {/* Phone Screen Glass */}
            <div className="relative rounded-[36px] bg-[#FFFFFF] overflow-hidden border border-[#E8E1D3] flex flex-col min-h-[580px] select-none text-[#1E3A2B]">
              
              {/* Dynamic Island / Status Bar */}
              <div className="pt-3 px-6 pb-2 flex items-center justify-between bg-white text-xs text-[#1E3A2B] font-semibold">
                <span>9:41</span>
                <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-800 ml-auto mr-1.5" />
                </div>
                <div className="flex items-center gap-1.5 text-[#1E3A2B]">
                  <Wifi className="w-3.5 h-3.5" />
                  <Battery className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>

              {/* App In-Phone Header */}
              <div className="px-4 py-3 border-b border-[#E8E1D3] bg-[#FAF5EC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1E3A2B] flex items-center justify-center text-white">
                    <ShieldCheck className="w-4 h-4 text-[#FAF5EC]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E3A2B] leading-none font-serif">
                      Surejob Escrow
                    </div>
                    <div className="text-[10px] text-[#4F6156] font-mono mt-0.5">
                      #SJ-8941
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E3A2B] text-white">
                  Active Job
                </span>
              </div>

              {/* In-Phone Job Overview Card */}
              <div className="p-4 bg-white border-b border-[#E8E1D3]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-[#4F6156] uppercase tracking-wider">
                      Service Order
                    </span>
                    <h3 className="text-sm font-bold text-[#1E3A2B] leading-tight mt-0.5 font-serif">
                      Inverter & Solar Installation
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-[#4F6156] mt-1">
                      <Star className="w-3 h-3 text-[#1E3A2B] fill-[#1E3A2B]" />
                      <span className="font-semibold text-[#1E3A2B]">4.9</span>
                      <span>• Artisan: Babatunde A.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-[#4F6156] block">
                      Escrow Vault
                    </span>
                    <span className="text-base font-black text-[#1E3A2B]">
                      ₦35,000
                    </span>
                  </div>
                </div>
              </div>

              {/* STATUS TIMELINE SECTION */}
              <div className="p-4 flex-1 flex flex-col justify-between bg-[#FDFBF7]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider font-serif">
                      Status Timeline
                    </span>
                    <span className="text-[11px] font-semibold text-[#4F6156]">
                      Milestone 1 of 1
                    </span>
                  </div>

                  <div className="space-y-4 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E8E1D3]">
                    
                    {/* Step 1: Booked (COMPLETED -> Forest Green) */}
                    <div className="relative flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A2B] text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#FDFBF7] z-10">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 bg-white p-2.5 rounded-xl border border-[#E8E1D3] shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1E3A2B]">
                            1. Booked
                          </span>
                          <span className="text-[10px] text-[#4F6156] font-mono">09:15 AM</span>
                        </div>
                        <p className="text-[11px] text-[#4F6156] mt-0.5">
                          Job request accepted by verified artisan.
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Held in Escrow (COMPLETED -> Forest Green) */}
                    <div className="relative flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A2B] text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#FDFBF7] z-10">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 bg-[#FAF5EC] p-2.5 rounded-xl border border-[#E8E1D3] shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1E3A2B]">
                            2. Held in Escrow
                          </span>
                          <span className="text-[10px] text-[#4F6156] font-mono">09:18 AM</span>
                        </div>
                        <p className="text-[11px] text-[#4F6156] mt-0.5">
                          ₦35,000 locked safely in Surejob Vault.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: In Progress (CURRENT STEP) */}
                    <div className="relative flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FAF5EC] border-2 border-[#1E3A2B] text-[#1E3A2B] flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#FDFBF7] z-10 relative">
                        <Clock className="w-4 h-4 text-[#1E3A2B]" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#1E3A2B] ring-2 ring-white animate-pulse" />
                      </div>
                      <div className="flex-1 bg-white p-2.5 rounded-xl border-2 border-[#1E3A2B] shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1E3A2B] flex items-center gap-1.5">
                            3. In Progress
                            <span className="w-2 h-2 rounded-full bg-[#1E3A2B] animate-ping" />
                          </span>
                          <span className="text-[10px] font-bold text-[#1E3A2B] bg-[#F5EFE3] px-1.5 py-0.5 rounded">LIVE</span>
                        </div>
                        <p className="text-[11px] text-[#4F6156] mt-0.5">
                          Artisan is on-site. Milestone execution ongoing.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* In-Phone Action Bottom Button */}
                <div className="pt-3 border-t border-[#E8E1D3]">
                  <div className="bg-[#FAF5EC] p-2 rounded-xl flex items-center justify-between mb-2 text-[10px] text-[#4F6156] font-medium">
                    <span className="flex items-center gap-1 text-[#1E3A2B] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2B]" /> Surejob Guarantee Active
                    </span>
                    <span className="font-bold text-[#1E3A2B]">Insurance: ₦100k</span>
                  </div>
                  <button
                    type="button"
                    className="w-full py-3 px-3 rounded-full bg-[#1E3A2B] hover:bg-[#14291E] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#FAF5EC]" />
                    <span>Authorize OTP Release (Code: 4829)</span>
                  </button>
                </div>

              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="pb-2 pt-1 flex justify-center bg-[#FDFBF7]">
                <div className="w-28 h-1 bg-gray-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>


        {/* ========================================================
            MOBILE / TABLET BENTO CARDS (< lg screens)
           ======================================================== */}
        <div className="lg:hidden w-full mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Mobile Card 1: Role Switcher */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E1D3]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#4F6156] uppercase">Select Role</span>
              <span className="text-[11px] font-semibold text-[#1E3A2B]">Active Mode</span>
            </div>
            <div className="p-1 bg-[#FAF5EC] rounded-xl flex items-center">
              <button
                type="button"
                onClick={() => setActiveRole("customer")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeRole === "customer" ? "bg-[#1E3A2B] text-white" : "text-[#1E3A2B]/70"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setActiveRole("worker")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeRole === "worker" ? "bg-[#1E3A2B] text-white" : "text-[#1E3A2B]/70"
                }`}
              >
                Artisan
              </button>
            </div>
          </div>

          {/* Mobile Card 2: Escrow Secured */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E1D3]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5EFE3] flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#1E3A2B]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#4F6156] uppercase">Vault Secured</span>
                <div className="text-sm font-extrabold text-[#1E3A2B] font-serif">
                  Escrow Secured: <span className="font-sans font-black">₦15,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card 3: Worker Payout Code */}
          <div className="sm:col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-[#E8E1D3] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#1E3A2B]" />
              <div>
                <div className="text-xs font-bold text-[#1E3A2B] font-serif">Artisan Payout Code: 4 8 2 9</div>
                <div className="text-[11px] text-[#4F6156]">Provide to artisan upon verified completion</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-full bg-[#1E3A2B] text-white text-xs font-bold"
            >
              {copiedCode ? "Copied" : "Copy Code"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
