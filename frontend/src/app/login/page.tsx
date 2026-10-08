"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, type Party } from "@/api";
import { ErrorNote, Field, PrimaryButton, Segmented } from "@/components/ui";

const DEMO_PASSWORD = "password123";
const DEMO_ACCOUNTS = [
  { label: "Demo customer · Tunde", email: "tunde@example.com" },
  { label: "Demo worker · Emeka", email: "emeka@example.com" },
];

/** Where to go after login: the page that sent us here, if it is a local path. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && next !== "/login" ? next : "/jobs";
}

export default function LoginScreen() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Party>("customer");
  const [trade, setTrade] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(nextPath());
  }, [loading, user, router]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.replace(nextPath());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") return run(() => login(email, password));
    return run(() =>
      register({ name, email, password, role, phone, ...(role === "worker" && trade.trim() ? { trade: trade.trim() } : {}) }),
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center text-[#14232B]">
      <div className="w-full max-w-[420px] min-h-screen bg-white flex flex-col px-6 py-8">
        <Link href="/" className="text-xl font-bold text-[#0B3C4F] tracking-tight">
          SureJob
        </Link>

        <div className="mt-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3C4F]">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-sm text-[#14232B] mt-1 opacity-70">
              {mode === "login" ? "Log in to book, pay and track your jobs." : "Customers book jobs; workers get paid for them."}
            </p>
          </div>

          <Segmented
            options={[
              { value: "login", label: "Log in" },
              { value: "register", label: "Sign up" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <>
                <Segmented
                  options={[
                    { value: "customer", label: "I need a job done" },
                    { value: "worker", label: "I do the work" },
                  ]}
                  value={role}
                  onChange={setRole}
                />
                <Field id="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                <Field
                  id="phone"
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  required
                  autoComplete="tel"
                />
                {role === "worker" && (
                  <Field id="trade" label="Trade" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. mechanic" />
                )}
              </>
            )}
            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            <ErrorNote message={error} />
            <PrimaryButton type="submit" busy={busy}>
              {mode === "login" ? "Log in" : "Create account"}
            </PrimaryButton>
          </form>

          {mode === "login" && (
            <div className="bg-[#EEF4F6] rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block">Demo accounts</span>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => login(account.email, DEMO_PASSWORD))}
                  className="w-full text-left text-sm bg-white rounded-lg px-3 py-2 text-[#0B3C4F] font-bold disabled:opacity-50"
                >
                  {account.label}
                  <span className="block text-xs font-normal text-[#14232B] opacity-60">
                    {account.email} · {DEMO_PASSWORD}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
