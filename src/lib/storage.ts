import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Fotos de las bebidas en Supabase Storage.
 * Bucket público de solo lectura: el kiosco las muestra sin login.
 * Solo el servidor sube o borra, con la llave secreta (nunca llega al navegador).
 */
const BUCKET = "drinks";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class StorageError extends Error {}

/** https://<ref>.supabase.co, tomado de SUPABASE_URL o deducido del usuario del pooler (postgres.<ref>) */
function projectUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, "");
  try {
    const user = decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").username);
    const ref = user.startsWith("postgres.") ? user.slice("postgres.".length) : null;
    return ref ? `https://${ref}.supabase.co` : null;
  } catch {
    return null;
  }
}

const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

export function storageReady() {
  return !!projectUrl() && !!serviceKey();
}

let client: SupabaseClient | null = null;
function sb() {
  const url = projectUrl();
  const key = serviceKey();
  if (!url || !key) throw new StorageError("Falta configurar SUPABASE_SERVICE_ROLE_KEY en .env para subir fotos");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const { error } = await sb().storage.getBucket(BUCKET);
    if (!error) return;
    const created = await sb().storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(TYPES),
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new StorageError(`No se pudo crear el bucket de fotos: ${created.error.message}`);
    }
  })().catch((e) => {
    bucketReady = null; // permite reintentar en la siguiente subida
    throw e;
  });
  return bucketReady;
}

/** Revisa los primeros bytes: el tipo declarado por el navegador no basta */
function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export async function uploadDrinkImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new StorageError("La foto pesa más de 5 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new StorageError("Sube una foto JPG, PNG o WebP");

  await ensureBucket();
  const path = `${randomUUID()}.${TYPES[type]}`;
  const { error } = await sb().storage.from(BUCKET).upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000", // el nombre es único: se puede cachear para siempre
    upsert: false,
  });
  if (error) throw new StorageError(`No se pudo subir la foto: ${error.message}`);
  return sb().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra la foto anterior solo si vive en nuestro bucket (no toca URLs externas) */
export async function removeDrinkImage(url: string | null | undefined) {
  if (!url || !storageReady()) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  const { error } = await sb().storage.from(BUCKET).remove([path]);
  if (error) console.error("No se pudo borrar la foto anterior", path, error.message);
}
