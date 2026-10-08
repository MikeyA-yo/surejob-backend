"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X, ArrowRight, Lock, Smartphone } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative bg-primary/4 border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
      <div className="px-6 max-w-7xl mx-auto">
        <nav className="h-20 flex items-center justify-between w-full">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-xl tracking-tight text-foreground group">
            <div className="size-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-5" />
            </div>
            <span className="font-bold text-[#1E3A2B] text-xl">Surejob</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Lock className="size-2.5" /> Escrow
            </span>
          </Link>

          {/* Centered Pill Navigation (HomeGuardian Style) */}
          <div className="hidden md:flex">
            <ul className="flex items-center gap-1 bg-card/80 p-1.5 rounded-full border border-border shadow-2xs">
              <li>
                <a
                  href="#why-choose-us"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  Why Surejob
                </a>
              </li>
              <li>
                <a
                  href="#trades"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  Trades
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#comparison"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  Comparison
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#testimonials"
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 hover:bg-primary/8 hover:text-foreground transition-colors"
                >
                  Reviews
                </a>
              </li>
            </ul>
          </div>

          {/* Action Buttons on Right */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-full border border-primary/20 transition-colors"
            >
              <Smartphone className="size-3.5" />
              <span>MVP App</span>
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all bg-primary text-primary-foreground hover:bg-[#162E22] h-10 px-5 text-sm shadow-xs"
            >
              Lock a Job <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-foreground/80 hover:bg-primary/8 focus:outline-hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 pb-6 pt-2 bg-card border-b border-border shadow-lg">
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="#why-choose-us"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2.5 px-3 rounded-lg text-sm font-medium text-foreground/90 hover:bg-primary/8"
              >
                Why Surejob
              </a>
            </li>
            <li>
              <a
                href="#trades"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2.5 px-3 rounded-lg text-sm font-medium text-foreground/90 hover:bg-primary/8"
              >
                Trades We Protect
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2.5 px-3 rounded-lg text-sm font-medium text-foreground/90 hover:bg-primary/8"
              >
                How Escrow Works
              </a>
            </li>
            <li>
              <a
                href="#comparison"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2.5 px-3 rounded-lg text-sm font-medium text-foreground/90 hover:bg-primary/8"
              >
                Comparison Matrix
              </a>
            </li>
            <li>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2.5 px-3 rounded-lg text-sm font-medium text-foreground/90 hover:bg-primary/8"
              >
                FAQ
              </a>
            </li>
            <li className="pt-2 border-t border-border flex flex-col gap-2">
              <Link
                href="/book"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full font-medium bg-primary text-primary-foreground hover:bg-[#162E22] h-11 px-6 text-sm"
              >
                Lock a Job <ArrowRight className="size-4" />
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
