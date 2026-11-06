"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CameraIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react";
import { DrinkArt } from "@/components/drink-art";
import { buttonClass, cn } from "@/components/ui";

export type PhotoState = { file: File | null; removed: boolean };

const MAX_SIDE = 1600;

/** Reduce la foto en el dispositivo antes de subirla: carga rápido en el kiosco y no gasta Storage */
async function downscale(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // formato que el navegador no sabe decodificar: el servidor lo valida
  }
}

export function PhotoPicker({
  current,
  category,
  name,
  ready,
  error,
  onChange,
}: {
  current: string | null;
  category: string;
  name: string;
  ready: boolean;
  error?: string;
  onChange: (p: PhotoState) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);

  // Libera la URL temporal de la vista previa
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    const small = await downscale(f);
    setBusy(false);
    setPreview(URL.createObjectURL(small));
    onChange({ file: small, removed: false });
  }

  function remove() {
    setPreview(null);
    onChange({ file: null, removed: true });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-[22px] shadow-card">
        <DrinkArt category={category} imageUrl={preview} name={name || "Foto de la bebida"} className="size-full" iconClassName="size-10" />
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <SpinnerGapIcon className="size-6 animate-spin motion-reduce:animate-none" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {ready ? (
          <>
            <div className="flex flex-wrap gap-2">
              <label htmlFor={inputId} className={buttonClass("secondary", "sm", "cursor-pointer")}>
                <CameraIcon className="size-4" weight="bold" />
                {preview ? "Cambiar foto" : "Subir foto"}
              </label>
              {preview && (
                <button type="button" onClick={remove} className={buttonClass("ghost", "sm")}>
                  <TrashIcon className="size-4" />
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <p className={cn("text-[13px]", error ? "text-danger" : "text-ink-2")} role={error ? "alert" : undefined}>
              {error ?? "JPG, PNG o WebP. Se guarda en Supabase Storage."}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-ink-2">
            Para subir fotos, agrega <code className="font-mono text-ink">SUPABASE_SERVICE_ROLE_KEY</code> en .env y reinicia
            el servidor.
          </p>
        )}
      </div>
    </div>
  );
}
