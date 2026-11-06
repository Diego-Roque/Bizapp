"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { Button, Field, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Correo" htmlFor="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} aria-invalid={!!fe.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={fe.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={!!fe.password}
        />
      </Field>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Entrando" : "Entrar"}
      </Button>
      <p className="text-center text-[14px] text-ink-2">
        ¿Vienes a pedir?{" "}
        <Link href="/" className="font-medium text-accent hover:underline">
          Ir al menú
        </Link>
      </p>
    </form>
  );
}
