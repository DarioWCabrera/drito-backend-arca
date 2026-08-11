import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  createPrivateKey,
  createPublicKey,
  timingSafeEqual,
  X509Certificate,
  type KeyObject,
} from "node:crypto";
import { Buffer } from "node:buffer";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";
import { PermissionsService } from "../common/security/permissions.service";
import { CredentialsVaultService } from "./crypto/credentials-vault.service";
import type {
  AmbienteArca,
  CredentialBundleV1,
  CredentialInspection,
} from "./types/arca.types";
import type { AuthUser } from "../common/auth/auth-user.type";

type SaveCredentialsParams = {
  user: AuthUser;
  comercioId: string;
  ambiente: AmbienteArca;
  alias?: string;
  passphrase?: string;
  certificate: Buffer;
  privateKey: Buffer;
};

@Injectable()
export class ArcaCredentialsService {
  constructor(
    private readonly supabase:
      SupabaseAdminService,
    private readonly permissions:
      PermissionsService,
    private readonly vault:
      CredentialsVaultService,
  ) {}

  private get bucketName(): string {
    return (
      process.env.ARCA_CREDENTIALS_BUCKET ??
      "arca-credenciales"
    );
  }

  private aad(
    comercioId: string,
    ambiente: AmbienteArca,
  ): string {
    return `drito-arca:${comercioId}:${ambiente}:v1`;
  }

  private storagePath(
    comercioId: string,
    ambiente: AmbienteArca,
  ): string {
    return `${comercioId}/${ambiente}/credenciales-v1.enc`;
  }

  private normalizeDigits(
    value: string | null | undefined,
  ): string {
    return (value ?? "").replace(/\D/g, "");
  }

  private detectCuit(
    subject: string,
  ): string | null {
    const matches =
      subject.match(/\d{11}/g) ?? [];

    return matches[0] ?? null;
  }

  private inspectCredentials(
    certificateBuffer: Buffer,
    privateKeyBuffer: Buffer,
    passphrase?: string,
  ): CredentialInspection {
    let certificate: X509Certificate;

    try {
      certificate =
        new X509Certificate(
          certificateBuffer,
        );
    } catch {
      throw new BadRequestException(
        "El certificado X.509 no pudo interpretarse",
      );
    }

    let privateKey: KeyObject;

    try {
      privateKey = createPrivateKey({
        key: privateKeyBuffer,
        passphrase:
          passphrase?.trim() || undefined,
      });
    } catch {
      throw new BadRequestException(
        "La clave privada no pudo abrirse. Verificá que sea PEM y que la passphrase sea correcta.",
      );
    }

    const certificatePublicKey =
      certificate.publicKey.export({
        format: "der",
        type: "spki",
      }) as Buffer;

    const privatePublicKey =
      createPublicKey(
        privateKey,
      ).export({
        format: "der",
        type: "spki",
      }) as Buffer;

    if (
      certificatePublicKey.length !==
        privatePublicKey.length ||
      !timingSafeEqual(
        certificatePublicKey,
        privatePublicKey,
      )
    ) {
      throw new BadRequestException(
        "El certificado y la clave privada no forman el mismo par criptográfico",
      );
    }

    const validFrom =
      new Date(certificate.validFrom);

    const validTo =
      new Date(certificate.validTo);

    if (
      Number.isNaN(validFrom.getTime()) ||
      Number.isNaN(validTo.getTime())
    ) {
      throw new BadRequestException(
        "No se pudo determinar la vigencia del certificado",
      );
    }

    const now = new Date();

    if (now < validFrom) {
      throw new BadRequestException(
        "El certificado todavía no está vigente",
      );
    }

    if (now > validTo) {
      throw new BadRequestException(
        "El certificado está vencido",
      );
    }

    return {
      subject: certificate.subject,
      issuer: certificate.issuer,
      serialNumber:
        certificate.serialNumber,
      fingerprint256:
        certificate.fingerprint256,
      validFrom,
      validTo,
      keyAlgorithm:
        privateKey.asymmetricKeyType ??
        "desconocido",
      cuitDetected:
        this.detectCuit(
          certificate.subject,
        ),
    };
  }

  private async verifyCommerceCuit(
    comercioId: string,
    inspection: CredentialInspection,
  ): Promise<void> {
    const { data, error } =
      await this.supabase.client
        .from("comercios")
        .select("cuit")
        .eq("id", comercioId)
        .single();

    if (error) {
      throw error;
    }

    const commerceCuit =
      this.normalizeDigits(data?.cuit);

    const certificateCuit =
      this.normalizeDigits(
        inspection.cuitDetected,
      );

    if (
      commerceCuit.length === 11 &&
      certificateCuit.length === 11 &&
      commerceCuit !== certificateCuit
    ) {
      throw new BadRequestException(
        "El CUIT detectado en el certificado no coincide con el CUIT del comercio",
      );
    }
  }

  private sanitizeMetadata(
    row: Record<string, unknown>,
  ) {
    return {
      configurada: true,
      id: row.id,
      comercio_id: row.comercio_id,
      ambiente_arca:
        row.ambiente_arca,
      alias: row.alias,
      estado: row.estado,
      certificado_subject:
        row.certificado_subject,
      certificado_issuer:
        row.certificado_issuer,
      certificado_serial:
        row.certificado_serial,
      certificado_fingerprint_sha256:
        row.certificado_fingerprint_sha256,
      certificado_valido_desde:
        row.certificado_valido_desde,
      certificado_valido_hasta:
        row.certificado_valido_hasta,
      clave_algoritmo:
        row.clave_algoritmo,
      cuit_certificado:
        row.cuit_certificado,
      ultimo_control_local_at:
        row.ultimo_control_local_at,
      ultimo_error:
        row.ultimo_error,
      updated_at: row.updated_at,
    };
  }

  async saveCredentials(
    params: SaveCredentialsParams,
  ) {
    await this.permissions.assertAny(
      params.user.id,
      params.comercioId,
      [
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    if (
      params.certificate.length === 0 ||
      params.privateKey.length === 0
    ) {
      throw new BadRequestException(
        "Los archivos no pueden estar vacíos",
      );
    }

    const inspection =
      this.inspectCredentials(
        params.certificate,
        params.privateKey,
        params.passphrase,
      );

    await this.verifyCommerceCuit(
      params.comercioId,
      inspection,
    );

    const bundle: CredentialBundleV1 = {
      version: 1,
      certificadoBase64:
        params.certificate.toString(
          "base64",
        ),
      clavePrivadaBase64:
        params.privateKey.toString(
          "base64",
        ),
      passphrase:
        params.passphrase?.trim() ||
        null,
      creadoAt:
        new Date().toISOString(),
    };

    const encrypted =
      this.vault.encrypt(
        bundle,
        this.aad(
          params.comercioId,
          params.ambiente,
        ),
      );

    const path =
      this.storagePath(
        params.comercioId,
        params.ambiente,
      );

    const { error: uploadError } =
      await this.supabase.client.storage
        .from(this.bucketName)
        .upload(
          path,
          encrypted,
          {
            contentType:
              "application/octet-stream",
            upsert: true,
          },
        );

    // Limpieza best-effort.
    encrypted.fill(0);

    if (uploadError) {
      throw uploadError;
    }

    const metadata = {
      comercio_id:
        params.comercioId,
      ambiente_arca:
        params.ambiente,
      alias:
        params.alias?.trim() || null,
      storage_path: path,
      bundle_version: 1,
      cifrado_algoritmo:
        "AES-256-GCM",
      certificado_subject:
        inspection.subject,
      certificado_issuer:
        inspection.issuer,
      certificado_serial:
        inspection.serialNumber,
      certificado_fingerprint_sha256:
        inspection.fingerprint256,
      certificado_valido_desde:
        inspection.validFrom.toISOString(),
      certificado_valido_hasta:
        inspection.validTo.toISOString(),
      clave_algoritmo:
        inspection.keyAlgorithm,
      cuit_certificado:
        inspection.cuitDetected,
      estado: "validas_localmente",
      ultimo_control_local_at:
        new Date().toISOString(),
      ultimo_error: null,
      creado_por: params.user.id,
      actualizado_por:
        params.user.id,
    };

    const { data, error } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .upsert(
          metadata,
          {
            onConflict:
              "comercio_id,ambiente_arca",
          },
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    const alias =
      params.alias?.trim() ||
      `ARCA ${params.ambiente}`;

    const { error: configError } =
      await this.supabase.client
        .from(
          "configuraciones_fiscales_comercio",
        )
        .update({
          certificado_alias: alias,
          certificado_vencimiento:
            inspection.validTo
              .toISOString()
              .slice(0, 10),
          certificado_identificador:
            inspection.fingerprint256,
          facturacion_electronica_activa:
            false,
          estado_arca:
            "credenciales_pendientes",
          ultimo_error_arca: null,
        })
        .eq(
          "comercio_id",
          params.comercioId,
        );

    if (configError) {
      throw configError;
    }

    // No devolvemos storage_path ni contenido sensible.
    return this.sanitizeMetadata(
      data as Record<string, unknown>,
    );
  }

  async getStatus(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ) {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.ver",
        "facturacion.configurar",
        "facturacion.configurar_arca",
        "configuracion.ver",
      ],
    );

    const { data, error } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .select("*")
        .eq("comercio_id", comercioId)
        .eq("ambiente_arca", ambiente)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        configurada: false,
        comercio_id: comercioId,
        ambiente_arca: ambiente,
      };
    }

    return this.sanitizeMetadata(
      data as Record<string, unknown>,
    );
  }

  async validateStoredCredentials(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ) {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.configurar",
        "facturacion.configurar_arca",
        "facturacion.consultar_arca",
      ],
    );

    const { data: metadata, error } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .select("*")
        .eq("comercio_id", comercioId)
        .eq("ambiente_arca", ambiente)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!metadata) {
      throw new NotFoundException(
        "No hay credenciales configuradas",
      );
    }

    const { data: blob, error: downloadError } =
      await this.supabase.client.storage
        .from(this.bucketName)
        .download(
          String(metadata.storage_path),
        );

    if (downloadError || !blob) {
      throw (
        downloadError ??
        new Error(
          "No se pudo descargar el bundle cifrado",
        )
      );
    }

    const encrypted = Buffer.from(
      await blob.arrayBuffer(),
    );

    let bundle: CredentialBundleV1;

    try {
      bundle = this.vault.decrypt(
        encrypted,
        this.aad(
          comercioId,
          ambiente,
        ),
      );
    } finally {
      encrypted.fill(0);
    }

    const certificate = Buffer.from(
      bundle.certificadoBase64,
      "base64",
    );

    const privateKey = Buffer.from(
      bundle.clavePrivadaBase64,
      "base64",
    );

    try {
      const inspection =
        this.inspectCredentials(
          certificate,
          privateKey,
          bundle.passphrase ?? undefined,
        );

      await this.verifyCommerceCuit(
        comercioId,
        inspection,
      );

      const { data: updated, error: updateError } =
        await this.supabase.client
          .from(
            "arca_credenciales_metadata",
          )
          .update({
            estado:
              "validas_localmente",
            ultimo_control_local_at:
              new Date().toISOString(),
            ultimo_error: null,
            actualizado_por: user.id,
          })
          .eq("id", metadata.id)
          .select("*")
          .single();

      if (updateError) {
        throw updateError;
      }

      return this.sanitizeMetadata(
        updated as Record<
          string,
          unknown
        >,
      );
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : "Error de validación local";

      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .update({
          estado: "error",
          ultimo_control_local_at:
            new Date().toISOString(),
          ultimo_error:
            message.slice(0, 500),
          actualizado_por: user.id,
        })
        .eq("id", metadata.id);

      throw validationError;
    } finally {
      certificate.fill(0);
      privateKey.fill(0);

      // La passphrase existe sólo en el objeto JS
      // durante esta operación y nunca se loguea.
      bundle.passphrase = null;
      bundle.clavePrivadaBase64 = "";
      bundle.certificadoBase64 = "";
    }
  }

  /**
   * Uso EXCLUSIVO de otros servicios del backend.
   * Nunca exponer el resultado desde un controller.
   */
  async loadCredentialsForBackend(
    comercioId: string,
    ambiente: AmbienteArca,
  ): Promise<{
    certificate: Buffer;
    privateKey: Buffer;
    passphrase: string | null;
  }> {
    const { data: metadata, error } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .select(
          "id, storage_path",
        )
        .eq("comercio_id", comercioId)
        .eq("ambiente_arca", ambiente)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!metadata) {
      throw new NotFoundException(
        "No hay credenciales ARCA configuradas",
      );
    }

    const { data: blob, error: downloadError } =
      await this.supabase.client.storage
        .from(this.bucketName)
        .download(
          String(metadata.storage_path),
        );

    if (downloadError || !blob) {
      throw (
        downloadError ??
        new Error(
          "No se pudo descargar el bundle cifrado",
        )
      );
    }

    const encrypted = Buffer.from(
      await blob.arrayBuffer(),
    );

    let bundle: CredentialBundleV1;

    try {
      bundle = this.vault.decrypt(
        encrypted,
        this.aad(
          comercioId,
          ambiente,
        ),
      );
    } finally {
      encrypted.fill(0);
    }

    const certificate = Buffer.from(
      bundle.certificadoBase64,
      "base64",
    );

    const privateKey = Buffer.from(
      bundle.clavePrivadaBase64,
      "base64",
    );

    const passphrase =
      bundle.passphrase ?? null;

    try {
      const inspection =
        this.inspectCredentials(
          certificate,
          privateKey,
          passphrase ?? undefined,
        );

      await this.verifyCommerceCuit(
        comercioId,
        inspection,
      );

      return {
        certificate,
        privateKey,
        passphrase,
      };
    } catch (error) {
      certificate.fill(0);
      privateKey.fill(0);
      throw error;
    } finally {
      bundle.passphrase = null;
      bundle.clavePrivadaBase64 = "";
      bundle.certificadoBase64 = "";
    }
  }

  async deleteCredentials(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ) {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    const { data: metadata, error } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .select(
          "id, storage_path",
        )
        .eq("comercio_id", comercioId)
        .eq("ambiente_arca", ambiente)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!metadata) {
      return {
        eliminado: true,
        ya_estaba_vacio: true,
      };
    }

    const { error: storageError } =
      await this.supabase.client.storage
        .from(this.bucketName)
        .remove([
          String(
            metadata.storage_path,
          ),
        ]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } =
      await this.supabase.client
        .from(
          "arca_credenciales_metadata",
        )
        .delete()
        .eq("id", metadata.id);

    if (deleteError) {
      throw deleteError;
    }

    await this.supabase.client
      .from(
        "configuraciones_fiscales_comercio",
      )
      .update({
        certificado_alias: null,
        certificado_vencimiento: null,
        certificado_identificador: null,
        facturacion_electronica_activa:
          false,
        estado_arca:
          "credenciales_pendientes",
      })
      .eq(
        "comercio_id",
        comercioId,
      );

    return {
      eliminado: true,
      ya_estaba_vacio: false,
    };
  }
}
