"use client";

import { useActionState, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { createStaff, setStaffActive } from "@/app/actions/users";
import { initialState } from "@/app/actions/types";
import { Sheet } from "@/components/sheet";
import { Switch } from "@/components/switch";
import { useAction } from "@/components/toaster";
import { useFormResult } from "@/components/use-form-result";
import { Badge, Button, EmptyState, Field, cn, inputClass } from "@/components/ui";

type Customer = { id: string; name: string; company: string; today: number; month: number };

export function CustomerList({ customers }: { customers: Customer[] }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? customers.filter((c) => `${c.name} ${c.company}`.toLowerCase().includes(needle))
      : customers;
    const map = new Map<string, Customer[]>();
    for (const c of list) map.set(c.company, [...(map.get(c.company) ?? []), c]);
    return [...map.entries()];
  }, [customers, q]);

  return (
    <section aria-labelledby="customers-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="customers-title" className="t-title text-ink">
          Clientes del mes
        </h2>
        {customers.length > 0 && (
          <div className="relative sm:w-72">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-2" />
            <input
              type="search"
              aria-label="Buscar persona o compañía"
              placeholder="Buscar persona o compañía"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(inputClass, "bg-surface pl-10 shadow-card")}
            />
          </div>
        )}
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={<UsersThreeIcon className="size-6" />}
          title="Nadie ha pedido este mes"
          body="Cuando alguien pida desde el kiosco con su compañía y nombre, aparece aquí."
        />
      ) : groups.length === 0 ? (
        <p className="text-[14px] text-ink-2">Sin resultados para “{q}”.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(([company, people]) => (
            <div key={company} className="overflow-hidden rounded-[20px] bg-surface shadow-card">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
                <p className="font-semibold text-ink">{company}</p>
                <p className="text-[13px] text-ink-2">
                  {people.reduce((s, p) => s + p.month, 0)} bebidas en el mes
                </p>
              </div>
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                    <span className="truncate text-ink">{p.name}</span>
                    <span className="flex shrink-0 items-center gap-3 font-mono text-ink-2 tabular-nums">
                      {p.today > 0 && <Badge tone="accent">Hoy {p.today}</Badge>}
                      <span>{p.month}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type Staff = { id: string; name: string; email: string; active: boolean };

export function StaffList({ staff, meId }: { staff: Staff[]; meId: string }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <section aria-labelledby="staff-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="staff-title" className="t-title text-ink">
          Cuentas de barra
        </h2>
        <Button
          variant="secondary"
          onClick={() => {
            setSession((s) => s + 1);
            setOpen(true);
          }}
        >
          <PlusIcon className="size-4" weight="bold" />
          Agregar
        </Button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
        {staff.map((u) => (
          <StaffRow key={u.id} user={u} isMe={u.id === meId} />
        ))}
      </ul>
      <StaffForm key={session} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function StaffRow({ user, isMe }: { user: Staff; isMe: boolean }) {
  const [pending, run] = useAction();
  return (
    <li className={cn("flex items-center gap-3 p-4", !user.active && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink">{user.name}</p>
          {isMe && <Badge>Tú</Badge>}
        </div>
        <p className="truncate text-[13px] text-ink-2">{user.email}</p>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <Switch
          checked={user.active}
          disabled={pending || isMe}
          label={`Cuenta de ${user.name} activa`}
          onChange={(v) => run(() => setStaffActive(user.id, v))}
        />
        Activa
      </label>
    </li>
  );
}

function StaffForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(createStaff, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};
  return (
    <Sheet open={open} onClose={onClose} title="Nueva cuenta de barra" description="Podrá entrar a /admin desde su celular.">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field label="Nombre" htmlFor="s-name" error={fe.name}>
          <input id="s-name" name="name" autoComplete="off" className={inputClass} aria-invalid={!!fe.name} />
        </Field>
        <Field label="Correo" htmlFor="s-email" error={fe.email}>
          <input id="s-email" name="email" type="email" autoComplete="off" className={inputClass} aria-invalid={!!fe.email} />
        </Field>
        <Field label="Contraseña" htmlFor="s-pass" error={fe.password} hint="Mínimo 8 caracteres. Compártela en persona.">
          <input id="s-pass" name="password" type="password" autoComplete="new-password" className={inputClass} aria-invalid={!!fe.password} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando" : "Crear cuenta"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
