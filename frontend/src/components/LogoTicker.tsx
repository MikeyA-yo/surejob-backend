import React from "react";
import { Shield, Building2, BadgeCheck, Landmark, Store, CreditCard } from "lucide-react";

export default function LogoTicker() {
  const partners = [
    { name: "Ecobank Agent", subtitle: "Over-the-Counter Cash", icon: Store },
    { name: "Xpress Point", subtitle: "Instant USSD Code", icon: CreditCard },
    { name: "Ecobank ATM", subtitle: "Cardless Cash-Out", icon: Landmark },
    { name: "Paystack Rails", subtitle: "Escrow Settlement", icon: Landmark },
    { name: "Interswitch", subtitle: "Verve & USSD *384#", icon: Shield },
    { name: "Leadway Assurance", subtitle: "Milestone Protection", icon: BadgeCheck },
    { name: "Lagos Artisans Guild", subtitle: "Verified Electricians & Plumbers", icon: Building2 },
    { name: "Federal Council of Technicians", subtitle: "Trade Union Partner", icon: Shield },
  ];

  return (
    <div className="w-full border-t border-[#E8E1D3] bg-[#FAF5EC] py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-6 text-center">
        <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#4F6156]">
          Cash out or book through Nigeria's Certified Payment Rails & Artisan Guilds
        </p>
      </div>

      {/* Infinite Marquee Strip with Left & Right Gradient Fades */}
      <div className="relative w-full overflow-hidden">
        {/* Left Gradient Fade Mask */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-[#FAF5EC] to-transparent" />
        
        {/* Right Gradient Fade Mask */}
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-[#FAF5EC] to-transparent" />

        <div className="animate-ticker flex items-center gap-6 sm:gap-8">
          {/* Loop 1 */}
          {partners.map((partner, index) => {
            const IconComponent = partner.icon;
            return (
              <div
                key={`partner-1-${index}`}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-[#E8E1D3] hover:border-[#1E3A2B]/40 shadow-2xs transition-all duration-200 group shrink-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#FAF5EC] border border-[#E8E1D3] flex items-center justify-center text-[#1E3A2B] group-hover:bg-[#1E3A2B] group-hover:text-white transition-colors">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-[#1E3A2B] whitespace-nowrap font-serif">
                    {partner.name}
                  </span>
                  <span className="text-[10px] text-[#4F6156] font-medium whitespace-nowrap">
                    {partner.subtitle}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loop 2 */}
          {partners.map((partner, index) => {
            const IconComponent = partner.icon;
            return (
              <div
                key={`partner-2-${index}`}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-[#E8E1D3] hover:border-[#1E3A2B]/40 shadow-2xs transition-all duration-200 group shrink-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#FAF5EC] border border-[#E8E1D3] flex items-center justify-center text-[#1E3A2B] group-hover:bg-[#1E3A2B] group-hover:text-white transition-colors">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-[#1E3A2B] whitespace-nowrap font-serif">
                    {partner.name}
                  </span>
                  <span className="text-[10px] text-[#4F6156] font-medium whitespace-nowrap">
                    {partner.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
