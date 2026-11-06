"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "./ui";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200",
        checked ? "bg-ok" : "bg-surface-2",
        disabled && "opacity-60",
      )}
    >
      <motion.span
        layout
        transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.3 }}
        className={cn("size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]", checked && "ml-auto")}
      />
    </button>
  );
}
