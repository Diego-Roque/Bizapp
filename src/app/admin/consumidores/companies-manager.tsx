"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BuildingsIcon, ListPlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { addEmployees, deleteCompany, deleteEmployee, saveCompany, updateEmployee } from "@/app/actions/companies";
import { initialState } from "@/app/actions/types";
import { Sheet } from "@/components/sheet";
import { useAction } from "@/components/toaster";
import { useFormResult } from "@/components/use-form-result";
import { Badge, Button, EmptyState, Field, PageHeader, cn, inputClass } from "@/components/ui";

type Employee = { id: string; name: string; today: number };
type Company = { id: string; name: string; employees: Employee[] };

type Editor =
  | { kind: "company"; company?: Company }
  | { kind: "add"; companyId: string }
  | { kind: "employee"; employee: Employee; companyId: string };

export function CompaniesManager({ companies }: { companies: Company[] }) {
  const [q, setQ] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  const edit = (e: Editor) => {
    setEditor(e);
    setSession((s) => s + 1);
    setOpen(true);
  };

  const employees = companies.reduce((s, c) => s + c.employees.length, 0);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.flatMap((c) => {
      if (c.name.toLowerCase().includes(needle)) return [c];
      const matches = c.employees.filter((e) => e.name.toLowerCase().includes(needle));
      return matches.length ? [{ ...c, employees: matches }] : [];
    });
  }, [companies, q]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Compañías"
        subtitle={`${companies.length} ${companies.length === 1 ? "compañía" : "compañías"}, ${employees} ${employees === 1 ? "empleado" : "empleados"}. Solo ellos pueden pedir en el kiosco.`}
        actions={
          <Button onClick={() => edit({ kind: "company" })}>
            <PlusIcon className="size-4" weight="bold" />
            Nueva compañía
          </Button>
        }
      />

      {companies.length > 0 && (
        <div className="relative sm:w-80">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-2" />
          <input
            type="search"
            aria-label="Buscar compañía o empleado"
            placeholder="Buscar compañía o empleado"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={cn(inputClass, "bg-surface pl-10 shadow-card")}
          />
        </div>
      )}

      {companies.length === 0 ? (
        <EmptyState
          icon={<BuildingsIcon className="size-6" />}
          title="Todavía no hay compañías"
          body="Da de alta una compañía y sus empleados para que puedan pedir desde el kiosco."
          action={<Button onClick={() => edit({ kind: "company" })}>Nueva compañía</Button>}
        />
      ) : visible.length === 0 ? (
        <p className="text-[14px] text-ink-2">Sin resultados para “{q}”.</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {visible.map((c) => (
            <CompanyCard
              key={c.id}
              company={companies.find((x) => x.id === c.id) ?? c}
              shown={c.employees}
              onEdit={() => edit({ kind: "company", company: c })}
              onAdd={() => edit({ kind: "add", companyId: c.id })}
              onEditEmployee={(employee) => edit({ kind: "employee", employee, companyId: c.id })}
            />
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          editor?.kind === "company"
            ? editor.company
              ? "Editar compañía"
              : "Nueva compañía"
            : editor?.kind === "add"
              ? "Agregar varios empleados"
              : "Editar empleado"
        }
        description={editor?.kind === "add" ? "Pega o escribe un nombre por renglón. Los que ya estén se omiten." : undefined}
      >
        {editor?.kind === "company" && <CompanyForm key={session} company={editor.company} onClose={() => setOpen(false)} />}
        {editor?.kind === "add" && (
          <AddEmployeesForm key={session} companies={companies} companyId={editor.companyId} onClose={() => setOpen(false)} />
        )}
        {editor?.kind === "employee" && (
          <EmployeeForm
            key={session}
            companies={companies}
            companyId={editor.companyId}
            employee={editor.employee}
            onClose={() => setOpen(false)}
          />
        )}
      </Sheet>
    </div>
  );
}

/* ---------- Tarjeta por compañía ---------- */

function initials(name: string) {
  const [a = "", b = ""] = name.split(" ");
  return (a[0] ?? "").concat(b[0] ?? "").toUpperCase();
}

function CompanyCard({
  company,
  shown,
  onEdit,
  onAdd,
  onEditEmployee,
}: {
  company: Company;
  shown: Employee[];
  onEdit: () => void;
  onAdd: () => void;
  onEditEmployee: (e: Employee) => void;
}) {
  const reduce = useReducedMotion();
  const n = company.employees.length;
  return (
    <section aria-label={company.name} className="overflow-hidden rounded-[20px] bg-surface shadow-card">
      <div className="flex items-center gap-1 py-3 pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{company.name}</h2>
          <p className={cn("text-[13px]", n === 0 ? "text-warn" : "text-ink-2")}>
            {n === 0 ? "Sin empleados: aún no aparece en el kiosco" : `${n} ${n === 1 ? "empleado" : "empleados"}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onAdd} aria-label={`Agregar varios empleados a ${company.name}`}>
          <ListPlusIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Renombrar ${company.name}`}>
          <PencilSimpleIcon className="size-4" />
        </Button>
        <ConfirmDelete
          label={`Eliminar ${company.name}`}
          confirmLabel={n > 0 ? `Eliminar con ${n}` : "Confirmar"}
          action={() => deleteCompany(company.id)}
        />
      </div>

      <ul className="border-t border-line">
        <AnimatePresence initial={false}>
          {shown.map((e) => (
            <motion.li
              key={e.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 py-1.5 pr-2 pl-4 text-[15px]">
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2"
                >
                  {initials(e.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{e.name}</span>
                {e.today > 0 && <Badge tone="accent">Hoy {e.today}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => onEditEmployee(e)} aria-label={`Editar ${e.name}`}>
                  <PencilSimpleIcon className="size-4" />
                </Button>
                <ConfirmDelete label={`Eliminar ${e.name}`} action={() => deleteEmployee(e.id)} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <QuickAdd companyId={company.id} companyName={company.name} first={n === 0} />
    </section>
  );
}

/** Alta de uno en uno sin salir de la tarjeta: Enter agrega y el foco se queda para el siguiente */
function QuickAdd({ companyId, companyName, first }: { companyId: string; companyName: string; first: boolean }) {
  const [pending, run] = useAction();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  function submit() {
    if (!value.trim() || pending) return;
    const fd = new FormData();
    fd.set("companyId", companyId);
    fd.set("names", value);
    run(
      () => addEmployees(initialState, fd),
      (r) => {
        if (r.ok) {
          setValue("");
          setError(undefined);
          input.current?.focus();
        } else setError(r.fieldErrors?.names ?? r.fieldErrors?.companyId);
      },
    );
  }

  return (
    <form
      className="border-t border-line px-4 py-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-3">
        <PlusIcon className="size-4 shrink-0 text-accent" weight="bold" aria-hidden />
        <input
          ref={input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          placeholder={first ? "Agrega el primer empleado" : "Agregar empleado"}
          aria-label={`Agregar empleado a ${companyName}`}
          aria-invalid={!!error}
          className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-2"
        />
        {value.trim() && (
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Agregando" : "Agregar"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="pt-1 pl-7 text-[13px] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** Basurero de dos toques: el primero arma, el segundo elimina; se desarma solo */
function ConfirmDelete({
  label,
  confirmLabel = "Confirmar",
  action,
}: {
  label: string;
  confirmLabel?: string;
  action: () => Promise<{ error?: string }>;
}) {
  const [pending, run] = useAction();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return confirming ? (
    <Button variant="danger" size="sm" disabled={pending} onClick={() => run(action)}>
      {confirmLabel}
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={label}>
      <TrashIcon className="size-4" />
    </Button>
  );
}

/* ---------- Formularios ---------- */

function FormActions({ pending, label, pendingLabel, onClose }: { pending: boolean; label: string; pendingLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-line pt-4">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
    </div>
  );
}

function CompanySelect({ companies, defaultValue, error }: { companies: Company[]; defaultValue: string; error?: string }) {
  return (
    <Field label="Compañía" htmlFor="e-company" error={error}>
      <select id="e-company" name="companyId" defaultValue={defaultValue} className={inputClass} aria-invalid={!!error}>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function CompanyForm({ company, onClose }: { company?: Company; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveCompany, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {company && <input type="hidden" name="id" value={company.id} />}
      <Field label="Nombre" htmlFor="c-name" error={fe.name}>
        <input
          id="c-name"
          name="name"
          defaultValue={company?.name}
          autoComplete="off"
          autoFocus
          maxLength={60}
          className={inputClass}
          aria-invalid={!!fe.name}
        />
      </Field>
      <FormActions pending={pending} label={company ? "Guardar" : "Crear compañía"} pendingLabel="Guardando" onClose={onClose} />
    </form>
  );
}

function AddEmployeesForm({ companies, companyId, onClose }: { companies: Company[]; companyId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(addEmployees, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <CompanySelect companies={companies} defaultValue={companyId} error={fe.companyId} />
      <Field label="Nombres" htmlFor="e-names" error={fe.names} hint="Nombre y apellido, uno por renglón.">
        <textarea
          id="e-names"
          name="names"
          rows={5}
          autoFocus
          autoComplete="off"
          placeholder={"Ana López\nCarlos Méndez"}
          className={cn(inputClass, "h-auto resize-y py-2.5")}
          aria-invalid={!!fe.names}
        />
      </Field>
      <FormActions pending={pending} label="Agregar" pendingLabel="Agregando" onClose={onClose} />
    </form>
  );
}

function EmployeeForm({
  companies,
  companyId,
  employee,
  onClose,
}: {
  companies: Company[];
  companyId: string;
  employee: Employee;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateEmployee, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={employee.id} />
      <Field label="Nombre" htmlFor="e-name" error={fe.name}>
        <input
          id="e-name"
          name="name"
          defaultValue={employee.name}
          autoComplete="off"
          maxLength={60}
          className={inputClass}
          aria-invalid={!!fe.name}
        />
      </Field>
      <CompanySelect companies={companies} defaultValue={companyId} error={fe.companyId} />
      <FormActions pending={pending} label="Guardar" pendingLabel="Guardando" onClose={onClose} />
    </form>
  );
}
