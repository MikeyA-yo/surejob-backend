"use client";

import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Navigation,
  Check,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

// Custom SVG Icons matching the reference image exactly
function ToiletIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 4h10v5H7z" />
      <path d="M5 9h14v2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V9z" />
      <path d="M10 16v4" />
      <path d="M14 16v4" />
      <path d="M8 20h8" />
    </svg>
  );
}

function PlantIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 10v10" />
      <path d="M12 14a4 4 0 0 0 4-4c0-2-2-3-4-3-2 0-4 1-4 3a4 4 0 0 0 4 4z" />
      <path d="M7 6c1.5 0 3 .8 3 2.5 0 1.5-1.5 2.5-3 2.5S4 10 4 8.5C4 6.8 5.5 6 7 6z" />
      <path d="M17 6c-1.5 0-3 .8-3 2.5 0 1.5 1.5 2.5 3 2.5s3-1 3-2.5C20 6.8 18.5 6 17 6z" />
    </svg>
  );
}

function BatteryIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="18" height="11" rx="2" />
      <path d="M22 11v3" />
      <path d="M6 11v3" />
      <path d="M7.5 12.5h-3" />
      <path d="M15 12.5h3" />
      <path d="M16.5 11v3" />
    </svg>
  );
}

function WrenchIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function PaintRollerIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="5" rx="1.5" />
      <path d="M20 7v3a2 2 0 0 1-2 2H9a2 2 0 0 0-2 2v2" />
      <rect x="5.5" y="16" width="3" height="5" rx="1" />
    </svg>
  );
}

function SprayBottleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 8V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
      <path d="M8 5h9l-1 3H8" />
      <path d="M7 8h10l1 13H6L7 8z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function HammerIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 12-8.5 8.5c-.8.8-2.2.8-3 0a2.12 2.12 0 0 1 0-3L12 9" />
      <path d="M17.64 4.36 21 7.72l-4.24 4.24-3.36-3.36 4.24-4.24z" />
      <path d="m14 3 2.5 2.5" />
      <path d="m18 7 3-1" />
    </svg>
  );
}

function ShoppingCartIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h11l2-7H6" />
    </svg>
  );
}

interface ServiceItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SERVICES: ServiceItem[] = [
  { id: "plumbing", name: "Plumbing", icon: ToiletIcon },
  { id: "gardening", name: "Gardening", icon: PlantIcon },
  { id: "electrical", name: "Electrical works", icon: BatteryIcon },
  { id: "repairs", name: "Home repairs", icon: WrenchIcon },
  { id: "painting", name: "Painting", icon: PaintRollerIcon },
  { id: "cleaning", name: "Cleaning", icon: SprayBottleIcon },
  { id: "carpentry", name: "Carpentry", icon: HammerIcon },
  { id: "shopping", name: "Shopping", icon: ShoppingCartIcon },
];

export default function HandymanOnboarding() {
  // Mode: "showcase" shows all 3 phones side-by-side like the image
  // "interactive" lets user step through phone 1 -> 2 -> 3
  const [viewMode, setViewMode] = useState<"showcase" | "interactive">("showcase");
  const [activeStep, setActiveStep] = useState<number>(1);

  // Screen 1 State
  const [firstName, setFirstName] = useState("Amaka");
  const [email, setEmail] = useState("amaka@example.com");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [emailOptIn, setEmailOptIn] = useState<"yes" | "no">("yes");

  // Screen 2 State: default selected are Gardening & Painting like the image!
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "gardening",
    "painting",
  ]);

  // Screen 3 State
  const [address, setAddress] = useState("Victoria Island, Lagos");
  const [isLocationDetected, setIsLocationDetected] = useState(true);

  // Escrow Confirmed modal state
  const [jobBooked, setJobBooked] = useState(false);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUseLocation = () => {
    setAddress("Admiralty Way, Lekki Phase 1, Lagos");
    setIsLocationDetected(true);
  };

  return (
    <div className="min-h-screen bg-[#273E31] text-[#1E3A2B] py-8 px-4 flex flex-col items-center justify-start selection:bg-[#FAF5EC] selection:text-[#1E3A2B]">
      
      {/* Top Bar / Mode Switcher */}
      <header className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 text-[#FAF5EC]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1E3A2B] border border-[#FAF5EC]/20 flex items-center justify-center font-serif text-lg font-bold text-[#FAF5EC]">
            S
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#FAF5EC]">
              Surejob
            </h1>
            <p className="text-xs text-[#FAF5EC]/70">
              Verified Handymen & Escrow Protection
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#1E3A2B] p-1 rounded-full border border-[#FAF5EC]/15">
          <button
            type="button"
            onClick={() => setViewMode("showcase")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "showcase"
                ? "bg-[#FAF5EC] text-[#1E3A2B] shadow-sm"
                : "text-[#FAF5EC]/80 hover:text-[#FAF5EC]"
            }`}
          >
            Showcase (3 Phones)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("interactive")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "interactive"
                ? "bg-[#FAF5EC] text-[#1E3A2B] shadow-sm"
                : "text-[#FAF5EC]/80 hover:text-[#FAF5EC]"
            }`}
          >
            Interactive Walkthrough
          </button>
        </div>
      </header>

      {/* =========================================================================
          VIEW MODE 1: SHOWCASE (3 Phones Side-by-Side as in the reference image)
         ========================================================================= */}
      {viewMode === "showcase" && (
        <div className="w-full max-w-6xl mx-auto">
          {/* 3 Phones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 justify-items-center">
            
            {/* Phone 1: Let's get you set up */}
            <div className="w-full max-w-[360px] bg-white rounded-[40px] shadow-2xl p-5 flex flex-col justify-between min-h-[660px] border-[5px] border-[#1A2D23]/30 relative">
              <StatusBar time="12:30" />

              <div className="pt-1 px-0.5 flex-1 flex flex-col">
                <h2 className="font-serif text-[22px] font-bold text-[#1E3A2B] leading-tight mb-1.5">
                  Let's get you set up
                </h2>
                <p className="text-[11px] text-[#58695F] leading-relaxed mb-4">
                  Create an account to find trusted handymen near you, compare services, and book in just a few taps
                </p>

                {/* Form Fields */}
                <div className="space-y-2.5">
                  <div>
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8D84] hover:text-[#1E3A2B]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-[#7E8D84] mt-0.5 block pl-1">
                      8 characters minimum
                    </span>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Invite code (optional)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />
                  </div>

                  {/* Warm Cream Offers Card */}
                  <div className="bg-[#FAF5EC] rounded-xl p-3 text-xs text-[#1E3A2B]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium leading-snug flex-1">
                        Want emails full of offers, updates and promotions?
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="offers1"
                            checked={emailOptIn === "yes"}
                            onChange={() => setEmailOptIn("yes")}
                            className="accent-[#1E3A2B]"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="offers1"
                            checked={emailOptIn === "no"}
                            onChange={() => setEmailOptIn("no")}
                            className="accent-[#1E3A2B]"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("interactive");
                    setActiveStep(2);
                  }}
                  className="w-full py-3 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Phone 2: What services are you interested in? */}
            <div className="w-full max-w-[360px] bg-white rounded-[40px] shadow-2xl p-5 flex flex-col justify-between min-h-[660px] border-[5px] border-[#1A2D23]/30 relative">
              <div>
                <StatusBar time="12:30" showSkip onSkip={() => {
                  setViewMode("interactive");
                  setActiveStep(3);
                }} />

                <div className="pt-1 px-0.5 mb-3">
                  <h2 className="font-serif text-[22px] font-bold text-[#1E3A2B] leading-tight mb-1">
                    What services are you interested in?
                  </h2>
                  <p className="text-[11px] text-[#58695F]">
                    Choose as many that apply
                  </p>
                </div>

                {/* 2-Column Grid of 8 Services */}
                <div className="grid grid-cols-2 gap-2.5">
                  {SERVICES.map((service) => {
                    const isSelected = selectedServices.includes(service.id);
                    const IconComponent = service.icon;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`h-[76px] rounded-2xl flex flex-col items-center justify-center gap-1.5 p-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-[#1E3A2B] text-white shadow-md scale-[1.02]"
                            : "bg-[#FAF5EC] text-[#1E3A2B] hover:bg-[#F3ECE0]"
                        }`}
                      >
                        <IconComponent className={isSelected ? "text-white w-5 h-5" : "text-[#1E3A2B] w-5 h-5"} />
                        <span className="text-[11px] font-semibold">{service.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Continue Pill */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("interactive");
                    setActiveStep(3);
                  }}
                  className="w-full py-3 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                >
                  Continue ({selectedServices.length} selected)
                </button>
              </div>
            </div>

            {/* Phone 3: Where are you located? */}
            <div className="w-full max-w-[360px] bg-white rounded-[40px] shadow-2xl p-5 flex flex-col justify-between min-h-[660px] border-[5px] border-[#1A2D23]/30 relative">
              <div>
                <StatusBar time="12:30" showSkip onSkip={() => setJobBooked(true)} />

                <div className="pt-1 px-0.5 mb-5">
                  <h2 className="font-serif text-[22px] font-bold text-[#1E3A2B] leading-tight mb-1">
                    Where are you located?
                  </h2>
                </div>

                {/* Address Input */}
                <div className="space-y-3.5 px-0.5">
                  <input
                    type="text"
                    placeholder="Enter address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                  />

                  {/* Use current location action */}
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="flex items-center gap-2 text-xs font-medium text-[#1E3A2B] hover:text-[#152B1F] transition-colors cursor-pointer pt-0.5"
                  >
                    <Navigation className="w-4 h-4 -rotate-45" />
                    <span>Use my current location</span>
                  </button>

                  {/* Surejob Escrow Protection guarantee badge */}
                  <div className="mt-6 bg-[#FAF5EC] rounded-2xl p-4 text-xs text-[#1E3A2B] border border-[#E8E2D5]/50">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <ShieldCheck className="w-4 h-4 text-[#1E3A2B]" />
                      <span>Surejob Guarantee Active</span>
                    </div>
                    <p className="text-[11px] text-[#58695F] leading-relaxed">
                      Payments are locked in escrow and only released when the job is done to your satisfaction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Done Pill Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setJobBooked(true)}
                  className="w-full py-3 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: INTERACTIVE WALKTHROUGH (Single focused phone)
         ========================================================================= */}
      {viewMode === "interactive" && (
        <div className="w-full max-w-[390px] mx-auto">
          {/* Stepper Header */}
          <div className="flex items-center justify-between text-[#FAF5EC] mb-4 text-xs font-medium px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FAF5EC]" />
              Step {activeStep} of 3
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="disabled:opacity-30 hover:underline cursor-pointer"
              >
                Prev
              </button>
              <span>•</span>
              <button
                type="button"
                disabled={activeStep === 3}
                onClick={() => setActiveStep((prev) => Math.min(3, prev + 1))}
                className="disabled:opacity-30 hover:underline cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[44px] shadow-2xl p-6 flex flex-col justify-between min-h-[740px] border-[6px] border-[#1A2D23]/40 relative">
            
            {/* Step 1 Content */}
            {activeStep === 1 && (
              <>
                <StatusBar time="12:30" />
                <div className="pt-2 px-1 flex-1 flex flex-col">
                  <h2 className="font-serif text-2xl font-bold text-[#1E3A2B] leading-tight mb-2">
                    Let's get you set up
                  </h2>
                  <p className="text-xs text-[#58695F] leading-relaxed mb-6">
                    Create an account to find trusted handymen near you, compare services, and book in just a few taps
                  </p>

                  <div className="space-y-3.5">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />
                    <div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-10 rounded-2xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7E8D84] hover:text-[#1E3A2B]"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-[#7E8D84] mt-1 block pl-1">
                        8 characters minimum
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Invite code (optional)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />

                    <div className="bg-[#FAF5EC] rounded-2xl p-3.5 text-xs text-[#1E3A2B]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium leading-snug flex-1">
                          Want emails full of offers, updates and promotions?
                        </span>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="offers2"
                              checked={emailOptIn === "yes"}
                              onChange={() => setEmailOptIn("yes")}
                              className="accent-[#1E3A2B]"
                            />
                            <span>Yes</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="offers2"
                              checked={emailOptIn === "no"}
                              onChange={() => setEmailOptIn("no")}
                              className="accent-[#1E3A2B]"
                            />
                            <span>No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="w-full py-3.5 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                  >
                    Create Account
                  </button>
                </div>
              </>
            )}

            {/* Step 2 Content */}
            {activeStep === 2 && (
              <>
                <div>
                  <StatusBar time="12:30" showSkip onSkip={() => setActiveStep(3)} />
                  <div className="pt-1 px-1 mb-4">
                    <h2 className="font-serif text-2xl font-bold text-[#1E3A2B] leading-tight mb-1">
                      What services are you interested in?
                    </h2>
                    <p className="text-xs text-[#58695F]">
                      Choose as many that apply
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {SERVICES.map((service) => {
                      const isSelected = selectedServices.includes(service.id);
                      const IconComponent = service.icon;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-2 p-3 text-xs font-medium transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-[#1E3A2B] text-white shadow-md scale-[1.02]"
                              : "bg-[#FAF5EC] text-[#1E3A2B] hover:bg-[#F3ECE0]"
                          }`}
                        >
                          <IconComponent className={isSelected ? "text-white w-6 h-6" : "text-[#1E3A2B] w-6 h-6"} />
                          <span className="text-[11px] font-semibold">{service.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="w-full py-3.5 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3 Content */}
            {activeStep === 3 && (
              <>
                <div>
                  <StatusBar time="12:30" showSkip onSkip={() => setJobBooked(true)} />
                  <div className="pt-1 px-1 mb-6">
                    <h2 className="font-serif text-2xl font-bold text-[#1E3A2B] leading-tight mb-2">
                      Where are you located?
                    </h2>
                  </div>

                  <div className="space-y-4 px-1">
                    <input
                      type="text"
                      placeholder="Enter address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8E2D5] bg-white text-xs text-[#1E3A2B] placeholder-[#9CA7A0] focus:outline-none focus:border-[#1E3A2B]"
                    />

                    <button
                      type="button"
                      onClick={handleUseLocation}
                      className="flex items-center gap-2 text-xs font-medium text-[#1E3A2B] hover:text-[#152B1F] transition-colors cursor-pointer pt-1"
                    >
                      <Navigation className="w-4 h-4 -rotate-45" />
                      <span>Use my current location</span>
                    </button>

                    <div className="mt-8 bg-[#FAF5EC] rounded-2xl p-4 text-xs text-[#1E3A2B] border border-[#E8E2D5]/50">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#1E3A2B]" />
                        <span>Surejob Escrow Enabled</span>
                      </div>
                      <p className="text-[11px] text-[#58695F] leading-relaxed">
                        Funds are safely escrowed until your artisan completes the work. Zero payment stress.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setJobBooked(true)}
                    className="w-full py-3.5 px-4 rounded-full bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#152B1F] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Booking Confirmation Toast / Modal */}
      {jobBooked && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-2xl border-4 border-[#1E3A2B]">
            <div className="w-14 h-14 rounded-full bg-[#FAF5EC] text-[#1E3A2B] mx-auto flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#1E3A2B] mb-2">
              You're all set!
            </h3>
            <p className="text-xs text-[#58695F] mb-6 leading-relaxed">
              Account created for <span className="font-bold text-[#1E3A2B]">{firstName}</span> in <span className="font-bold text-[#1E3A2B]">{address}</span>. We've matched you with verified local handymen.
            </p>
            <div className="bg-[#FAF5EC] rounded-2xl p-3 text-xs mb-6 text-left">
              <span className="font-bold text-[#1E3A2B] block mb-1">Services Selected:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedServices.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-[#1E3A2B] text-white text-[10px] capitalize">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setJobBooked(false)}
              className="w-full py-3.5 rounded-full bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer"
            >
              Back to Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Reusable Top Status Bar with dynamic Skip button
function StatusBar({
  time = "12:30",
  showSkip = false,
  onSkip,
}: {
  time?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs font-semibold text-[#1E3A2B] pb-3 px-1 select-none">
      <span>{time}</span>
      <div className="flex items-center gap-3">
        {showSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#1E3A2B] font-medium hover:underline cursor-pointer"
          >
            Skip
          </button>
        )}
        <div className="flex items-center gap-1.5 text-[#1E3A2B]">
          {/* Signal bars */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="16" width="3" height="6" rx="1" />
            <rect x="8" y="11" width="3" height="11" rx="1" />
            <rect x="14" y="6" width="3" height="16" rx="1" />
            <rect x="20" y="2" width="3" height="20" rx="1" />
          </svg>
          {/* Wifi */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {/* Battery */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="16" height="10" rx="2" />
            <path d="M22 11v2" />
            <rect x="4" y="9" width="10" height="6" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}
