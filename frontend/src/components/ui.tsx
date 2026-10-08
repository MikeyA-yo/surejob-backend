"use client";

import React from "react";

/** Shared form and feedback pieces in the app's borderless, soft-fill style. */

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-[#B23A48]/10 text-[#B23A48] text-sm rounded-xl px-4 py-3">
      {message}
    </div>
  );
}

export function Card({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#EEF4F6] rounded-xl p-6">
      {label && <span className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-1">{label}</span>}
      {children}
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export function Field({ label, id, ...input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-[#0B3C4F] uppercase tracking-wider block mb-2">
        {label}
      </label>
      <input
        id={id}
        {...input}
        className="w-full h-12 px-4 bg-[#EEF4F6] rounded-xl text-sm font-normal text-[#14232B] border-0 outline-none placeholder:text-[#14232B]/40"
      />
    </div>
  );
}

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  tone?: "primary" | "danger";
}

export function PrimaryButton({ busy, tone = "primary", children, disabled, ...button }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      {...button}
      disabled={disabled || busy}
      className={`w-full h-12 ${tone === "danger" ? "bg-[#B23A48]" : "bg-[#0B3C4F]"} text-white font-bold rounded-xl flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50`}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex w-full bg-[#EEF4F6] rounded-full p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-3 py-2 rounded-full transition-colors ${
            value === o.value ? "bg-[#0B3C4F] text-white font-bold" : "text-[#14232B] font-normal"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
