import React from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import TradesSection from "@/components/TradesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ComparisonSection from "@/components/ComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5] text-[#14232B] overflow-x-hidden selection:bg-[#1E3A2B] selection:text-[#FAF9F5]">
      {/* 1. Centered Pill Navbar */}
      <Navbar />

      {/* 2. Main Sections */}
      <main className="flex-1">
        {/* Hero Section with HomeGuardian Style Tech Grid & Live Escrow Contract Card */}
        <HeroSection />

        {/* Why Choose Us: Bento Cards with Top Grid Mask & Dashed Settlement Rails */}
        <WhyChooseUsSection />

        {/* Trades We Protect: 4 Framed Trade Cards */}
        <TradesSection />

        {/* How It Works: 3-Step Milestone Protocol & Dispute Guarantee */}
        <HowItWorksSection />

        {/* Comparison Matrix: Dashed Border Table (SureJob vs Cash vs WhatsApp) */}
        <ComparisonSection />

        {/* Verified Reviews */}
        <TestimonialsSection />

        {/* FAQ Accordion */}
        <FAQSection />

        {/* Bottom Call to Action Banner */}
        <CTASection />
      </main>

      {/* 3. Footer */}
      <Footer />
    </div>
  );
}
