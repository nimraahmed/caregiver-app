"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-300",
    secondary: "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50",
    ghost: "text-teal-800 hover:bg-teal-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-5 text-base font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Choice({
  label,
  selected,
  onClick,
  sub,
  multi,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  sub?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        selected ? "border-teal-700 bg-teal-50 text-teal-900" : "border-stone-300 bg-white text-stone-800 hover:border-stone-400"
      }`}
    >
      <span>
        <span className="block text-base font-medium">{label}</span>
        {sub && <span className="block text-sm text-stone-500">{sub}</span>}
      </span>
      <span
        className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center border ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300"
        }`}
      >
        {selected && <Check size={16} />}
      </span>
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "teal" | "amber" | "red" | "stone" }) {
  const styles = {
    neutral: "bg-stone-100 text-stone-700",
    teal: "bg-teal-100 text-teal-900",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-900",
    stone: "bg-stone-200 text-stone-800",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-stone-50 text-stone-900">
      <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 backdrop-blur print:hidden">
          <div className="mx-auto flex w-full max-w-md gap-3 px-5 py-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
