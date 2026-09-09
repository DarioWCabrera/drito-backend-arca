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

  if (!process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS) {
    throw new Error(
      "Falta DRITO_ARCA_MASTER_KEY_PREVIOUS para probar la rotación.",
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

  // Puede leer bundles viejos usando current + previous.
  const vaultRotacion =
    new CredentialsVaultService();

  // Creamos un segundo vault que sólo conoce
  // la clave NUEVA para verificar el recifrado.
  const previous =
    process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS;

  delete process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS;

  const vaultSoloNueva =
    new CredentialsVaultService();

  process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS =
    previous;

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

    const encryptedViejo = Buffer.from(
      await blob.arrayBuffer(),
    );

    let encryptedNuevo: Buffer | null = null;

    try {
      const aad =
        `drito-arca:${item.comercio_id}:${item.ambiente_arca}:v1`;

      const bundle =
        vaultRotacion.decrypt(
          encryptedViejo,
          aad,
        );

      encryptedNuevo =
        vaultRotacion.encrypt(
          bundle,
          aad,
        );

      // Esta verificación NO dispone de la clave vieja.
      const verificado =
        vaultSoloNueva.decrypt(
          encryptedNuevo,
          aad,
        );

      if (
        verificado.version !== 1 ||
        !verificado.certificadoBase64 ||
        !verificado.clavePrivadaBase64
      ) {
        throw new Error(
          `Bundle ${item.ambiente_arca} inválido tras recifrado`,
        );
      }

      console.log(
        `${item.ambiente_arca} → RECIFRADO OK`,
      );
    } finally {
      encryptedViejo.fill(0);
      encryptedNuevo?.fill(0);
    }
  }

  console.log(
    "Prueba terminada: no se subió ni modificó ningún bundle.",
  );
}

main().catch((error) => {
  console.error(
    "Prueba de recifrado ARCA: ERROR",
    error instanceof Error
      ? error.message
      : "Error desconocido",
  );
  process.exitCode = 1;
});
