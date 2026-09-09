import { createClient } from "@supabase/supabase-js";
import { CredentialsVaultService } from "../arca/crypto/credentials-vault.service";
import type { CredentialBundleV1 } from "../arca/types/arca.types";

type MetadataArca = {
  comercio_id: string;
  ambiente_arca: "homologacion" | "produccion";
  storage_path: string;
};

function bundlesIguales(
  a: CredentialBundleV1,
  b: CredentialBundleV1,
): boolean {
  return (
    a.version === b.version &&
    a.certificadoBase64 === b.certificadoBase64 &&
    a.clavePrivadaBase64 === b.clavePrivadaBase64 &&
    a.passphrase === b.passphrase &&
    a.creadoAt === b.creadoAt
  );
}

async function main() {
  const ejecutar =
    process.argv.includes("--execute");

  const confirmado =
    process.argv.includes("--confirm=ROTAR");

  if (ejecutar && !confirmado) {
    throw new Error(
      "Para ejecutar la rotación real también debés indicar --confirm=ROTAR.",
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const currentKey =
    process.env.DRITO_ARCA_MASTER_KEY?.trim();

  const previousKey =
    process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS?.trim();

  const bucket =
    process.env.ARCA_CREDENTIALS_BUCKET ??
    "arca-credenciales";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!currentKey || !previousKey) {
    throw new Error(
      "La rotación requiere DRITO_ARCA_MASTER_KEY y DRITO_ARCA_MASTER_KEY_PREVIOUS.",
    );
  }

  if (currentKey === previousKey) {
    throw new Error(
      "La clave nueva y la anterior no pueden ser iguales.",
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

  // Lee bundles viejos con:
  // nueva -> fallback anterior.
  const vaultRotacion =
    new CredentialsVaultService();

  // Segundo vault que conoce SOLAMENTE
  // la clave nueva.
  delete process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS;

  const vaultSoloNueva =
    new CredentialsVaultService();

  process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS =
    previousKey;

  const { data, error } = await supabase
    .from("arca_credenciales_metadata")
    .select(
      "comercio_id, ambiente_arca, storage_path",
    )
    .order("ambiente_arca");

  if (error) {
    throw error;
  }

  const items =
    (data ?? []) as MetadataArca[];

  if (items.length === 0) {
    throw new Error(
      "No se encontraron bundles ARCA para rotar.",
    );
  }

  const rotationId =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  console.log(
    ejecutar
      ? "MODO EJECUCIÓN — rotación real habilitada"
      : "MODO DRY-RUN — no se modificará Storage",
  );

  console.log(
    `Bundles encontrados: ${items.length}`,
  );

  for (const item of items) {
    const aad =
      `drito-arca:${item.comercio_id}:${item.ambiente_arca}:v1`;

    const {
      data: blob,
      error: downloadError,
    } = await supabase.storage
      .from(bucket)
      .download(item.storage_path);

    if (downloadError || !blob) {
      throw (
        downloadError ??
        new Error(
          `No se pudo descargar ${item.ambiente_arca}`,
        )
      );
    }

    const encryptedViejo =
      Buffer.from(
        await blob.arrayBuffer(),
      );

    let encryptedNuevo:
      | Buffer
      | null = null;

    try {
      // 1. Descifrar el bundle actual.
      const bundle =
        vaultRotacion.decrypt(
          encryptedViejo,
          aad,
        );

      // 2. Recifrar siempre con la clave NUEVA.
      encryptedNuevo =
        vaultRotacion.encrypt(
          bundle,
          aad,
        );

      // 3. Verificación en memoria usando
      // exclusivamente la clave nueva.
      const verificadoMemoria =
        vaultSoloNueva.decrypt(
          encryptedNuevo,
          aad,
        );

      if (
        !bundlesIguales(
          bundle,
          verificadoMemoria,
        )
      ) {
        throw new Error(
          `${item.ambiente_arca}: el contenido cambió durante el recifrado`,
        );
      }

      if (!ejecutar) {
        console.log(
          `${item.ambiente_arca} → DRY-RUN OK`,
        );
        continue;
      }

      // 4. Backup CIFRADO del archivo anterior.
      const backupPath =
        `rotacion-backups/${rotationId}/${item.storage_path}`;

      const {
        error: backupError,
      } = await supabase.storage
        .from(bucket)
        .upload(
          backupPath,
          encryptedViejo,
          {
            contentType:
              "application/octet-stream",
            upsert: false,
          },
        );

      if (backupError) {
        throw new Error(
          `${item.ambiente_arca}: no se pudo crear el backup cifrado`,
        );
      }

      // 5. Reemplazar el blob original.
      const {
        error: uploadError,
      } = await supabase.storage
        .from(bucket)
        .upload(
          item.storage_path,
          encryptedNuevo,
          {
            contentType:
              "application/octet-stream",
            upsert: true,
          },
        );

      if (uploadError) {
        throw new Error(
          `${item.ambiente_arca}: no se pudo guardar el bundle recifrado`,
        );
      }

      try {
        // 6. Descargar nuevamente desde Storage.
        const {
          data: blobVerificacion,
          error: verifyDownloadError,
        } = await supabase.storage
          .from(bucket)
          .download(
            item.storage_path,
          );

        if (
          verifyDownloadError ||
          !blobVerificacion
        ) {
          throw (
            verifyDownloadError ??
            new Error(
              "No se pudo descargar para verificar",
            )
          );
        }

        const encryptedVerificacion =
          Buffer.from(
            await blobVerificacion.arrayBuffer(),
          );

        try {
          // 7. Debe abrirse SIN clave anterior.
          const bundleVerificado =
            vaultSoloNueva.decrypt(
              encryptedVerificacion,
              aad,
            );

          if (
            !bundlesIguales(
              bundle,
              bundleVerificado,
            )
          ) {
            throw new Error(
              "El bundle verificado no coincide con el original",
            );
          }
        } finally {
          encryptedVerificacion.fill(0);
        }
      } catch (verificationError) {
        // 8. Rollback automático al blob anterior.
        const {
          error: restoreError,
        } = await supabase.storage
          .from(bucket)
          .upload(
            item.storage_path,
            encryptedViejo,
            {
              contentType:
                "application/octet-stream",
              upsert: true,
            },
          );

        if (restoreError) {
          throw new Error(
            `${item.ambiente_arca}: FALLÓ LA VERIFICACIÓN Y TAMBIÉN EL ROLLBACK`,
          );
        }

        throw verificationError;
      }

      console.log(
        `${item.ambiente_arca} → ROTACIÓN OK + BACKUP CIFRADO`,
      );
    } finally {
      encryptedViejo.fill(0);
      encryptedNuevo?.fill(0);
    }
  }

  console.log(
    ejecutar
      ? "Rotación terminada y verificada."
      : "Dry-run terminado: no se modificó ningún bundle.",
  );
}

main().catch((error) => {
  console.error(
    "Rotación ARCA: ERROR",
    error instanceof Error
      ? error.message
      : "Error desconocido",
  );

  process.exitCode = 1;
});
