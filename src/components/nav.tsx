"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ChartBarIcon,
  ClipboardTextIcon,
  CoffeeIcon,
  PackageIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "./ui";

const ADMIN_LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "/admin", label: "Barra", icon: ClipboardTextIcon },
  { href: "/admin/menu", label: "Menú", icon: CoffeeIcon },
  { href: "/admin/inventario", label: "Ingredientes", icon: PackageIcon },
  { href: "/admin/reporte", label: "Reporte", icon: ChartBarIcon },
  { href: "/admin/usuarios", label: "Personas", icon: UsersThreeIcon },
];

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

export function AdminNav() {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Administración" className="hidden items-center gap-1 md:flex">
      {ADMIN_LINKS.map((l) => {
        const active = isActive(path, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "pressable relative rounded-full px-3.5 py-1.5 text-[14px] font-medium",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-full bg-surface-2"
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Administración"
      className="glass no-print fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ADMIN_LINKS.map((l) => {
          const active = isActive(path, l.href);
          const I = l.icon;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium",
                  active ? "text-accent" : "text-ink-2",
                )}
              >
                <I className="size-6" weight={active ? "fill" : "regular"} />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
