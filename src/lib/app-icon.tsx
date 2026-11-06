import { ImageResponse } from "next/og";
import { MartiniIcon } from "@phosphor-icons/react/dist/ssr";

/** Ícono de la app: el martini de la marca en blanco sobre el naranja, con el brillo del material */
export function renderAppIcon(size: number, { rounded }: { rounded: boolean }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: rounded ? size * 0.22 : 0,
          background: "linear-gradient(155deg, #f0874a 0%, #c4480f 60%, #9e3606 100%)",
        }}
      >
        <MartiniIcon size={size * 0.58} color="#ffffff" weight="bold" />
      </div>
    ),
    { width: size, height: size },
  );
}
