/** Limpia lo que escriben en el kiosco: espacios dobles, bordes */
export function tidy(s: string) {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Clave estable para "la misma persona": sin acentos, minúsculas, espacios simples */
export function customerKey(company: string, name: string) {
  const norm = (s: string) =>
    tidy(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  return `${norm(company)}|${norm(name)}`;
}
