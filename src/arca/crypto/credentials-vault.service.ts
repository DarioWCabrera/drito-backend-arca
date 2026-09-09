import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { Buffer } from "node:buffer";
import type {
  CredentialBundleV1,
  EncryptedEnvelopeV1,
} from "../types/arca.types";

@Injectable()
export class CredentialsVaultService {
  private readonly key: Buffer;
  private readonly previousKey: Buffer | null;

  constructor() {
    this.key = Buffer.from(
      process.env.DRITO_ARCA_MASTER_KEY!,
      "base64",
    );

    if (this.key.length !== 32) {
      throw new InternalServerErrorException(
        "Clave maestra ARCA inválida",
      );
    }

    const previousKeyRaw =
      process.env.DRITO_ARCA_MASTER_KEY_PREVIOUS?.trim();

    this.previousKey = previousKeyRaw
      ? Buffer.from(previousKeyRaw, "base64")
      : null;

    if (
      this.previousKey &&
      this.previousKey.length !== 32
    ) {
      throw new InternalServerErrorException(
        "Clave maestra ARCA anterior inválida",
      );
    }
  }

  encrypt(
    bundle: CredentialBundleV1,
    aad: string,
  ): Buffer {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
      "aes-256-gcm",
      this.key,
      iv,
    );

    cipher.setAAD(
      Buffer.from(aad, "utf8"),
    );

    const plaintext = Buffer.from(
      JSON.stringify(bundle),
      "utf8",
    );

    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);

    const envelope: EncryptedEnvelopeV1 = {
      version: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      authTag:
        cipher.getAuthTag().toString("base64"),
      ciphertext:
        encrypted.toString("base64"),
    };

    // Limpieza best-effort del buffer plano.
    plaintext.fill(0);

    return Buffer.from(
      JSON.stringify(envelope),
      "utf8",
    );
  }

  decrypt(
    encryptedEnvelope: Buffer,
    aad: string,
  ): CredentialBundleV1 {
    const envelope = JSON.parse(
      encryptedEnvelope.toString("utf8"),
    ) as EncryptedEnvelopeV1;

    if (
      envelope.version !== 1 ||
      envelope.algorithm !== "aes-256-gcm"
    ) {
      throw new Error(
        "Versión de bundle cifrado no soportada",
      );
    }

    const decryptWithKey = (
      key: Buffer,
    ): CredentialBundleV1 => {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(envelope.iv, "base64"),
      );

      decipher.setAAD(
        Buffer.from(aad, "utf8"),
      );

      decipher.setAuthTag(
        Buffer.from(
          envelope.authTag,
          "base64",
        ),
      );

      const plaintext = Buffer.concat([
        decipher.update(
          Buffer.from(
            envelope.ciphertext,
            "base64",
          ),
        ),
        decipher.final(),
      ]);

      try {
        return JSON.parse(
          plaintext.toString("utf8"),
        ) as CredentialBundleV1;
      } finally {
        plaintext.fill(0);
      }
    };

    try {
      return decryptWithKey(this.key);
    } catch (currentKeyError) {
      if (!this.previousKey) {
        throw currentKeyError;
      }

      return decryptWithKey(
        this.previousKey,
      );
    }
  }
}
