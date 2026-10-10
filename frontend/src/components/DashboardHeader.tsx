"use client";

import React, { useEffect, useState } from "react";

interface DashboardHeaderProps {
  userName?: string;
  className?: string;
}

export function DashboardHeader({ userName, className = "" }: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  const displayName = userName ? `, ${userName}` : "";

  return (
    <div className={`space-y-1 ${className}`}>
      <h1 className="text-3xl font-bold text-[#0B3C4F] tracking-tight">
        {greeting}{displayName}
      </h1>
      <p className="text-sm text-[#14232B] opacity-70 font-normal">
        Track your active escrows and manage your bookings.
      </p>
    </div>
  );
}

export default DashboardHeader;
