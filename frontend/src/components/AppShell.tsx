"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getConfig, type Modes } from "@/api";

interface AppShellProps {
  children: React.ReactNode;
  bottomAction?: React.ReactNode;
  backHref?: string;
}

/** Fetched once per page load; the badge reflects what the backend is actually configured to use. */
let modesPromise: Promise<Modes> | null = null;

function modeLabel(modes: Modes | null): string {
  if (!modes) return "Mode: …";
  const values = Object.values(modes);
  if (values.every((m) => m === "mock")) return "Mode: Simulated";
  if (values.every((m) => m === "live")) return "Mode: Sandbox";
  return "Mode: Mixed";
}

/** Mobile frame for every app screen. Sends logged-out visitors to /login. */
export default function AppShell({ children, bottomAction, backHref }: AppShellProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [modes, setModes] = useState<Modes | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  useEffect(() => {
    modesPromise ??= getConfig();
    modesPromise.then(setModes).catch(() => {
      modesPromise = null;
    });
  }, []);

  const screens = [
    { label: "My jobs", href: "/jobs" },
    ...(user?.role === "customer" ? [{ label: "Book", href: "/book" }] : []),
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center text-[#14232B]">
      <div className="w-full max-w-[420px] min-h-screen bg-white flex flex-col relative">
        <header className="px-6 pt-6 pb-2 shrink-0">
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
              {modeLabel(modes)}
            </span>
          </div>

          {user && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[#14232B]">
                <span className="opacity-60">Signed in as </span>
                <strong className="font-bold text-[#0B3C4F]">{user.name}</strong>
                <span className="opacity-60"> · {user.role === "customer" ? "Customer" : "Worker"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="inline-flex items-center gap-1 text-xs text-[#0B3C4F] bg-[#EEF4F6] px-2.5 py-1 rounded-full"
              >
                <LogOut className="size-3" /> Log out
              </button>
            </div>
          )}

          <nav className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
            {screens.map((s) => {
              const active = pathname === s.href;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                    active ? "bg-[#0B3C4F] text-white font-bold" : "bg-[#EEF4F6] text-[#14232B] font-normal"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-6 pt-4 pb-28">
          {loading || !user ? <p className="text-sm text-[#14232B] opacity-60">Loading…</p> : children}
        </main>

        {bottomAction && user && (
          <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto p-6 bg-white/95 backdrop-blur-xs z-30">
            {bottomAction}
          </div>
        )}
      </div>
    </div>
  );
}
