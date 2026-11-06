"use client";

import { PrinterIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <PrinterIcon className="size-4" weight="bold" />
      Imprimir
    </Button>
  );
}
