"use client";

import { useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions/types";
import { useToast } from "./toaster";

/** Reacciona una sola vez a cada resultado nuevo de useActionState */
export function useFormResult(state: ActionState, onSuccess: () => void) {
  const toast = useToast();
  const handled = useRef(state);
  const cb = useRef(onSuccess);
  useEffect(() => {
    cb.current = onSuccess;
  });
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      if (state.message) toast(state.message);
      cb.current();
    } else if (state.error) toast(state.error, "error");
  }, [state, toast]);
}
