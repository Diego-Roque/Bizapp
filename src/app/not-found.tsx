import Link from "next/link";
import { BrandMark } from "@/components/app-header";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="ambient grid min-h-[100dvh] place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <BrandMark />
        <h1 className="t-display mt-10 text-ink">Esta página no existe</h1>
        <p className="mt-3 text-[17px] text-ink-2">Puede que el enlace esté mal escrito.</p>
        <Link href="/" className={buttonClass("primary", "lg", "mt-8")}>
          Ir al menú
        </Link>
      </div>
    </main>
  );
}
