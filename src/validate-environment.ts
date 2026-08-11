import { Buffer } from "node:buffer";

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DRITO_ARCA_MASTER_KEY",
] as const;

export function validateEnvironment(): void {
  const missing = REQUIRED.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${missing.join(", ")}`,
    );
  }

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (serviceRole.startsWith("VITE_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no puede ser una variable VITE_.",
    );
  }

  const masterKey = Buffer.from(
    process.env.DRITO_ARCA_MASTER_KEY ?? "",
    "base64",
  );

  if (masterKey.length !== 32) {
    throw new Error(
      "DRITO_ARCA_MASTER_KEY debe contener exactamente 32 bytes en Base64.",
    );
  }

  const origins = (
    process.env.DRITO_FRONTEND_URLS ?? ""
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (
    process.env.NODE_ENV === "production" &&
    origins.length === 0
  ) {
    throw new Error(
      "En producción DRITO_FRONTEND_URLS es obligatorio.",
    );
  }
}
