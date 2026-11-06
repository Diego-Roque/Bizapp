import { BrandMark } from "@/components/app-header";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <BrandMark />
        </div>
        {children}
      </div>
    </main>
  );
}
