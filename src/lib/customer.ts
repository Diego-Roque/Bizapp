/** Limpia lo que se escribe: espacios dobles, bordes */
export function tidy(s: string) {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Clave estable para "el mismo nombre": sin acentos, minúsculas, espacios simples */
export function nameKey(s: string) {
  return tidy(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
