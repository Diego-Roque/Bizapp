import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AdminTabBar } from "@/components/nav";
import { requireAdmin } from "@/lib/dal";

// Verifica la sesión contra la base sin bloquear el shell estático
async function Guard() {
  await requireAdmin();
  return null;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="ambient min-h-[100dvh]">
      <Suspense>
        <Guard />
      </Suspense>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-28 md:px-6 md:pt-10 md:pb-16">{children}</main>
      <AdminTabBar />
    </div>
  );
}
