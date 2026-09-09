import { createClient } from "@supabase/supabase-js";
import { CredentialsVaultService } from "../arca/crypto/credentials-vault.service";

type MetadataArca = {
  comercio_id: string;
  ambiente_arca: "homologacion" | "produccion";
  storage_path: string;
};

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env.ARCA_CREDENTIALS_BUCKET ??
    "arca-credenciales";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!process.env.DRITO_ARCA_MASTER_KEY) {
    throw new Error(
      "Falta DRITO_ARCA_MASTER_KEY.",
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const vault = new CredentialsVaultService();

  const { data, error } = await supabase
    .from("arca_credenciales_metadata")
    .select(
      "comercio_id, ambiente_arca, storage_path",
    )
    .order("ambiente_arca");

  if (error) {
    throw error;
  }

  const items = (data ?? []) as MetadataArca[];

  console.log(
    `Bundles ARCA encontrados: ${items.length}`,
  );

  for (const item of items) {
    const { data: blob, error: downloadError } =
      await supabase.storage
        .from(bucket)
        .download(item.storage_path);

    if (downloadError || !blob) {
      throw (
        downloadError ??
        new Error(
          `No se pudo descargar bundle ${item.ambiente_arca}`,
        )
      );
    }

    const encrypted = Buffer.from(
      await blob.arrayBuffer(),
    );

    try {
      const bundle = vault.decrypt(
        encrypted,
        `drito-arca:${item.comercio_id}:${item.ambiente_arca}:v1`,
      );

      if (
        bundle.version !== 1 ||
        !bundle.certificadoBase64 ||
        !bundle.clavePrivadaBase64
      ) {
        throw new Error(
          `Bundle ${item.ambiente_arca} con formato inválido`,
        );
      }

      console.log(
        `${item.ambiente_arca} → OK`,
      );
    } finally {
      encrypted.fill(0);
    }
  }

  console.log(
    "Dry-run terminado: no se modificó ningún bundle.",
  );
}

main().catch((error) => {
  console.error(
    "Dry-run ARCA: ERROR",
    error instanceof Error
      ? error.message
      : "Error desconocido",
  );
  process.exitCode = 1;
});
