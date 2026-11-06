"use client";

import { useEffect, useState } from "react";
import { ArrowClockwiseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { Button } from "./ui";

/**
 * Pantalla de error compartida. En el kiosco nadie va a estar ahí para tocar "Reintentar",
 * así que `autoRetrySeconds` lo hace solo.
 */
export function ErrorView({
  error,
  retry,
  title,
  body,
  autoRetrySeconds,
}: {
  error: unknown;
  retry: () => void;
  title: string;
  body: string;
  autoRetrySeconds?: number;
}) {
  const [left, setLeft] = useState(autoRetrySeconds ?? 0);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!autoRetrySeconds) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [autoRetrySeconds]);

  useEffect(() => {
    if (autoRetrySeconds && left <= 0) retry();
  }, [autoRetrySeconds, left, retry]);

  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-ink-2">
        <WifiSlashIcon className="size-7" />
      </span>
      <h1 className="t-title mt-6 text-ink">{title}</h1>
      <p className="mt-2 text-[16px] text-ink-2">{body}</p>
      <Button size="lg" className="mt-8" onClick={() => retry()}>
        <ArrowClockwiseIcon className="size-4" weight="bold" />
        Reintentar
        {autoRetrySeconds ? (
          <span className="font-mono text-[14px] opacity-70 tabular-nums">{Math.max(0, left)}</span>
        ) : null}
      </Button>
    </div>
  );
}
