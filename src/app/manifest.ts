import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" en el iPad y abrir el kiosco sin la barra de Safari
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BizBar",
    short_name: "BizBar",
    description: "Pide tus bebidas del bar de la oficina",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0b0d",
    theme_color: "#c4480f",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
