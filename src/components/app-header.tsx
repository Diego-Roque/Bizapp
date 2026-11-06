import Link from "next/link";
import { MartiniIcon, SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/app/actions/auth";
import { AdminNav } from "./nav";

export function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-on-accent">
        <MartiniIcon className="size-[18px]" weight="bold" />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">BizBar</span>
    </span>
  );
}

export function AppHeader() {
  return (
    <header className="glass no-print sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/admin" className="pressable rounded-lg">
          <BrandMark />
        </Link>
        <AdminNav />
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="pressable rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Kiosco
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="pressable flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <SignOutIcon className="size-[18px]" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
