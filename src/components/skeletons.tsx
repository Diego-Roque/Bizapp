import { cn } from "./ui";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none", className)} />;
}

export function HeaderSkeleton() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-20 rounded-full" />
      </div>
    </header>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-10 w-56" />
        </div>
        <Bone className="h-[76px] w-64 rounded-[20px]" />
      </div>
      <div className="flex flex-col gap-5">
        <Bone className="h-6 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Bone key={i} className="aspect-[4/5] rounded-[20px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "list" }: { variant?: "list" | "grid" | "board" | "report" }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <Bone className="h-10 w-48" />
        <Bone className="h-4 w-64" />
      </div>
      {variant === "board" && (
        <div className="grid gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Bone className="h-5 w-24" />
              <Bone className="h-40 rounded-[20px]" />
            </div>
          ))}
        </div>
      )}
      {variant === "grid" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Bone key={i} className="h-44 rounded-[20px]" />
          ))}
        </div>
      )}
      {variant === "list" && <Bone className="h-96 rounded-[20px]" />}
      {variant === "report" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-24 rounded-[20px]" />
            ))}
          </div>
          <Bone className="h-56 rounded-[20px]" />
          <Bone className="h-72 rounded-[20px]" />
        </>
      )}
    </div>
  );
}
