"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

function AnimatedStat({ value, suffix = "%", duration = 1600 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const startTime = performance.now();

          const updateCount = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Smooth ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.round(easeProgress * value);

            setCount(currentVal);

            if (progress < 1) {
              requestAnimationFrame(updateCount);
            }
          };

          requestAnimationFrame(updateCount);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#14232B]">
      {/* 1. Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#0B3C4F]/10">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="text-xl font-bold text-[#0B3C4F]">
            SureJob.
          </Link>

          {/* Center: Anchor Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-[#14232B]">
            <a href="#how-it-works" className="hover:opacity-70 transition-opacity">
              How it Works
            </a>
            <a href="#trust-layer" className="hover:opacity-70 transition-opacity">
              Trust Layer
            </a>
          </nav>

          {/* Right: Sandbox Badge + Launch Demo Button */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF4F6] border border-[#0B3C4F]/10 text-xs font-bold text-[#0B3C4F]">
              <span className="size-2 rounded-full bg-[#1B8A5A] animate-pulse" />
              <span>Sandbox Mode</span>
            </div>

            <Link
              href="/book"
              className="min-h-[48px] px-6 bg-[#1E3A2B] hover:bg-[#162E22] text-white font-bold rounded-xl inline-flex items-center justify-center transition-colors text-sm"
            >
              Launch Demo
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#0B3C4F] leading-tight">
              A payment and protection layer for Nigeria&apos;s informal service economy.
            </h1>

            <p className="mt-6 text-lg sm:text-xl font-normal text-[#14232B] max-w-2xl mx-auto leading-relaxed opacity-80">
              Eliminating the trust deficit between clients and artisans with milestone escrow, automatic damage insurance, and bankless cash payouts.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="w-full sm:w-auto min-h-[48px] px-8 bg-[#1E3A2B] hover:bg-[#162E22] text-white font-bold rounded-xl inline-flex items-center justify-center transition-colors text-base"
              >
                Launch Demo
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto min-h-[48px] px-8 bg-[#EEF4F6] hover:bg-[#E2ECF0] border border-[#0B3C4F]/10 text-[#0B3C4F] font-bold rounded-xl inline-flex items-center justify-center transition-all text-base"
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>

        {/* 3. The Problem (Stats Section) */}
        <section id="problem" className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                The Reality
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0B3C4F]">
                The Informal Economy Runs Without a Safety Net
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Stat 1 */}
              <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#0B3C4F]/25 rounded-2xl p-8 sm:p-10 space-y-4 transition-all hover:-translate-y-0.5">
                <span className="text-5xl sm:text-6xl font-bold text-[#0B3C4F] block">
                  <AnimatedStat value={90} />
                </span>
                <div className="pt-3 border-t border-[#0B3C4F]/10 space-y-2">
                  <h3 className="text-xl font-bold text-[#0B3C4F]">
                    of Nigeria&apos;s workforce is informal
                  </h3>
                  <p className="text-sm font-normal text-[#14232B] leading-relaxed opacity-80">
                    From auto mechanics to plumbers and electricians, over 80 million people work on verbal agreements without contract enforcement or deposit safety.
                  </p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#0B3C4F]/25 rounded-2xl p-8 sm:p-10 space-y-4 transition-all hover:-translate-y-0.5">
                <span className="text-5xl sm:text-6xl font-bold text-[#0B3C4F] block">
                  <AnimatedStat value={26} />
                </span>
                <div className="pt-3 border-t border-[#0B3C4F]/10 space-y-2">
                  <h3 className="text-xl font-bold text-[#0B3C4F]">
                    are completely unbanked
                  </h3>
                  <p className="text-sm font-normal text-[#14232B] leading-relaxed opacity-80">
                    Over a quarter of skilled service workers lack traditional bank accounts or smartphones on-site, making app-only digital fintechs unworkable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. The Solution (3 Pillars) */}
        <section id="how-it-works" className="py-24">
          <div id="trust-layer" className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
                The Solution
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0B3C4F]">
                Three Pillars of Guaranteed Trust
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#1E3A2B]/30 rounded-2xl p-8 space-y-4 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B3C4F]/10">
                  <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
                    Pillar 01
                  </span>
                  <span className="size-1.5 rounded-full bg-[#1E3A2B]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#0B3C4F]">
                  Secure Escrow
                </h3>
                <p className="text-sm font-normal text-[#14232B] leading-relaxed opacity-80">
                  Customers pay upfront with total confidence. Funds remain safely locked in regulated trustee custody and release only when you inspect and approve the job.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#1E3A2B]/30 rounded-2xl p-8 space-y-4 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B3C4F]/10">
                  <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
                    Pillar 02
                  </span>
                  <span className="size-1.5 rounded-full bg-[#1E3A2B]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#0B3C4F]">
                  Embedded Insurance
                </h3>
                <p className="text-sm font-normal text-[#14232B] leading-relaxed opacity-80">
                  Every funded job is automatically covered against accidental property damage and worker injury via Curacel. Zero extra paperwork required.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#1E3A2B]/30 rounded-2xl p-8 space-y-4 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B3C4F]/10">
                  <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">
                    Pillar 03
                  </span>
                  <span className="size-1.5 rounded-full bg-[#1E3A2B]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#0B3C4F]">
                  Cardless Cash
                </h3>
                <p className="text-sm font-normal text-[#14232B] leading-relaxed opacity-80">
                  Workers withdraw earnings on-site at any Ecobank Xpress Point, agent kiosk, or ATM using a simple 6-digit code. No bank account or debit card needed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Final CTA */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-[#EEF4F6] border border-[#0B3C4F]/10 hover:border-[#0B3C4F]/20 rounded-2xl p-12 sm:p-16 text-center space-y-6 transition-all">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0B3C4F]">
                Experience Nigeria&apos;s Informal Escrow MVP
              </h2>

              <p className="text-base sm:text-lg font-normal text-[#14232B] max-w-xl mx-auto leading-relaxed opacity-80">
                Test the complete walkthrough from job booking and instant cover quote to OTP release and cardless cash withdrawal.
              </p>

              <div>
                <Link
                  href="/book"
                  className="min-h-[48px] px-8 bg-[#1E3A2B] hover:bg-[#162E22] text-white font-bold rounded-xl inline-flex items-center justify-center transition-colors text-base"
                >
                  Launch Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="py-12 border-t border-[#0B3C4F]/10">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm font-normal text-[#14232B] opacity-70">
          <span>
            © {new Date().getFullYear()} SureJob. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
