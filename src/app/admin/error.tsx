"use client";

import { ErrorView } from "@/components/error-view";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorView
      error={error}
      retry={retry}
      title="No se pudo cargar"
      body="Revisa la conexión a internet. Si sigue fallando, puede ser la base de datos."
    />
  );
}
