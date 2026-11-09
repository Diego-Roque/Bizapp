"use client";

import {
  BeerBottleIcon,
  BrandyIcon,
  CoffeeIcon,
  DropIcon,
  LeafIcon,
  MartiniIcon,
  OrangeIcon,
  OrangeSliceIcon,
  PintGlassIcon,
  SnowflakeIcon,
  WineIcon,
  type IconProps,
} from "@phosphor-icons/react";
import { cn } from "./ui";

export function CategoryIcon({ category, className, weight }: { category: string } & IconProps) {
  const p = { className, weight };
  switch (category) {
    case "Café":
      return <CoffeeIcon {...p} />;
    case "Café frío":
      return <SnowflakeIcon {...p} />;
    case "Té":
      return <LeafIcon {...p} />;
    case "Refresher":
      return <OrangeSliceIcon {...p} />;
    case "Destilado":
      return <BrandyIcon {...p} />;
    case "Agua":
      return <DropIcon {...p} />;
    case "Jugo":
      return <OrangeIcon {...p} />;
    case "Cerveza":
      return <BeerBottleIcon {...p} />;
    case "Vino":
      return <WineIcon {...p} />;
    case "Coctel":
    case "Mocktail":
      return <MartiniIcon {...p} />;
    default:
      return <PintGlassIcon {...p} />;
  }
}

// Cada categoría tiene el color de lo que hay en el vaso. Decorativo: la identidad la da el nombre.
const TINTS: Record<string, [string, string]> = {
  Café: ["#a8734f", "#5b3522"],
  "Café frío": ["#c9a184", "#6e4a33"],
  Té: ["#9cc26f", "#4d7a34"],
  Refresher: ["#ff8a7a", "#d6336c"],
  Destilado: ["#e0a85a", "#8a4f14"],
  Refresco: ["#ef6a5b", "#a8261d"],
  Agua: ["#7cc4f5", "#2a74c2"],
  Jugo: ["#ffbf4d", "#e5720f"],
  Cerveza: ["#f3c552", "#c4820c"],
  Vino: ["#b8456a", "#651430"],
  Coctel: ["#f27ab5", "#a92a6e"],
  Mocktail: ["#ff9a76", "#d14b31"],
};
const FALLBACK: [string, string] = ["#f0874a", "#b8400c"];

export function DrinkArt({
  category,
  imageUrl,
  name,
  className,
  iconClassName = "size-12",
}: {
  category: string;
  imageUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URLs externas que define el barman
      <img src={imageUrl} alt={name} loading="lazy" className={cn("object-cover", className)} />
    );
  }
  const [from, to] = TINTS[category] ?? FALLBACK;
  return (
    <div
      aria-hidden
      className={cn("relative grid place-items-center overflow-hidden text-white", className)}
      style={{ background: `linear-gradient(155deg, ${from}, ${to})` }}
    >
      {/* Brillo especular arriba a la izquierda + borde de luz: lee como material, no como color plano */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 20% 0%, rgb(255 255 255 / 0.35), transparent 55%), linear-gradient(to top, rgb(0 0 0 / 0.12), transparent 40%)",
          boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 0 0 0.5px rgb(255 255 255 / 0.18)",
          borderRadius: "inherit",
        }}
      />
      <CategoryIcon
        category={category}
        className={cn("relative drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)]", iconClassName)}
        weight="fill"
      />
    </div>
  );
}
