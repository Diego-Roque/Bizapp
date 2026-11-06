"use client";

import { ErrorView } from "@/components/error-view";

export default function KioskError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorView
      error={error}
      retry={retry}
      title="El menú no cargó"
      body="Perdimos la conexión con la barra. Lo volvemos a intentar en unos segundos."
      autoRetrySeconds={15}
    />
  );
}
