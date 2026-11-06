import { renderAppIcon } from "@/lib/app-icon";

// iOS aplica su propia máscara redondeada: el ícono va cuadrado
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180, { rounded: false });
}
