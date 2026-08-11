export type AmbienteArca =
  | "homologacion"
  | "produccion";

export type CredentialBundleV1 = {
  version: 1;
  certificadoBase64: string;
  clavePrivadaBase64: string;
  passphrase: string | null;
  creadoAt: string;
};

export type EncryptedEnvelopeV1 = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
};

export type CredentialInspection = {
  subject: string;
  issuer: string;
  serialNumber: string;
  fingerprint256: string;
  validFrom: Date;
  validTo: Date;
  keyAlgorithm: string;
  cuitDetected: string | null;
};
