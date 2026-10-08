"use client";

import React from "react";
import { ShieldCheck, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-14 text-sm text-muted-foreground">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-border">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xl text-[#1E3A2B]">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                <ShieldCheck className="size-4.5" />
              </div>
              <span>Surejob</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Nigeria’s trusted milestone escrow platform for informal trades, handymen, and verified contractors. Zero payment anxiety for clients; guaranteed cash for workers.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Lock className="size-3.5" />
              <span>Custody managed by Ecobank Escrow Trustee Ltd.</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Product</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#why-choose-us" className="hover:text-primary transition-colors">Why Surejob</a></li>
              <li><a href="#trades" className="hover:text-primary transition-colors">Trades We Protect</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How Escrow Works</a></li>
              <li><a href="#comparison" className="hover:text-primary transition-colors">Comparison Matrix</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Col 3: Popular Trades */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Popular Trades</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#trades" className="hover:text-primary transition-colors">Solar & Inverters</a></li>
              <li><a href="#trades" className="hover:text-primary transition-colors">Plumbing & Boreholes</a></li>
              <li><a href="#trades" className="hover:text-primary transition-colors">Roofing & Carpentry</a></li>
              <li><a href="#trades" className="hover:text-primary transition-colors">Generators & Auto</a></li>
              <li><a href="#trades" className="hover:text-primary transition-colors">AC & Refrigeration</a></li>
            </ul>
          </div>

          {/* Col 4: Trust & Compliance */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Trust & Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-primary transition-colors">Escrow Protection Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Dispute Resolution Rules</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">NIN Verification Standards</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Notice</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & legal disclaimers */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Surejob Technologies Ltd. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Escrow deposits held safely in trust with CBN-licensed partner commercial banks. NDIC coverage applies to custodial accounts.
          </p>
        </div>
      </div>
    </footer>
  );
}
