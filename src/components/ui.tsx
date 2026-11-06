import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-[1.06]",
  secondary: "bg-surface-2 text-ink hover:brightness-[0.97] dark:hover:brightness-[1.15]",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger-soft text-danger hover:brightness-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-[15px] gap-2",
  lg: "h-12 px-6 text-[16px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "pressable inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium select-none",
    "disabled:opacity-45 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export const inputClass = cn(
  "w-full h-11 rounded-xl bg-surface-2 px-3.5 text-[15px] text-ink placeholder:text-ink-2",
  "border border-transparent outline-none transition-colors",
  "focus:border-accent focus:bg-surface focus-visible:outline-none",
  "aria-[invalid=true]:border-danger",
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-[20px] bg-surface shadow-card", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-line px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-ink-2">{icon}</div>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 max-w-[42ch] text-[14px] text-ink-2">{body}</p>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="t-display text-ink">{title}</h1>
        {subtitle ? <div className="mt-1.5 text-[15px] text-ink-2">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
