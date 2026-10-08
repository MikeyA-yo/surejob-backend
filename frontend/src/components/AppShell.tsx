"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { ChevronLeft } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  bottomAction: React.ReactNode;
  backHref?: string;
}

export default function AppShell({
  children,
  bottomAction,
  backHref,
}: AppShellProps) {
  const { role, setRole } = useRole();
  const pathname = usePathname();

  const screens = [
    { label: "Home", href: "/" },
    { label: "Book", href: "/book" },
    { label: "Pay", href: "/job/1/pay" },
    { label: "Status", href: "/job/1" },
    { label: "Payout", href: "/job/1/payout" },
    { label: "Claim", href: "/job/1/claim" },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center text-[#14232B]">
      {/* Mobile Shell Constraint: max-w-[420px] */}
      <div className="w-full max-w-[420px] min-h-screen bg-white flex flex-col relative">
        {/* Header - Completely Borderless, Clean Contrast */}
        <header className="px-6 pt-6 pb-2 shrink-0">
          {/* Top Row: Brand & Simulated Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {backHref && (
                <Link
                  href={backHref}
                  className="size-8 rounded-full bg-[#EEF4F6] flex items-center justify-center text-[#0B3C4F] mr-1"
                  aria-label="Back"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              )}
              <Link href="/" className="text-xl font-bold text-[#0B3C4F] tracking-tight">
                SureJob
              </Link>
            </div>

            <span className="text-xs font-normal text-[#0B3C4F] bg-[#EEF4F6] px-2.5 py-1 rounded-full">
              Mode: Simulated
            </span>
          </div>

          {/* Role Switcher Pill */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-normal text-[#14232B] opacity-60">
              Role
            </span>
            <div className="inline-flex bg-[#EEF4F6] rounded-full p-1 text-xs">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  role === "customer"
                    ? "bg-[#0B3C4F] text-white font-bold"
                    : "text-[#14232B] font-normal"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole("worker")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  role === "worker"
                    ? "bg-[#0B3C4F] text-white font-bold"
                    : "text-[#14232B] font-normal"
                }`}
              >
                Worker
              </button>
            </div>
          </div>

          {/* Quick Prototype Screen Switcher */}
          <nav className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
            {screens.map((s, idx) => {
              const active = pathname === s.href;
              return (
                <Link
                  key={idx}
                  href={s.href}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[#0B3C4F] text-white font-bold"
                      : "bg-[#EEF4F6] text-[#14232B] font-normal"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Scrollable Content Body with Generous Whitespace */}
        <main className="flex-1 px-6 pt-4 pb-28">
          {children}
        </main>

        {/* The Anti-Gravity Button: Borderless, Chunky h-12, Anchored to Bottom */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto p-6 bg-white/95 backdrop-blur-xs z-30">
          {bottomAction}
        </div>
      </div>
    </div>
  );
}
