"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca los datos del servidor cada `seconds` mientras la pestaña está visible */
export function Poller({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(id);
      id = setInterval(() => router.refresh(), seconds * 1000);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else clearInterval(id);
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);
  return null;
}
