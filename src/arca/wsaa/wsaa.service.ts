import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Buffer } from "node:buffer";
import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { AuthUser } from "../../common/auth/auth-user.type";
import { PermissionsService } from "../../common/security/permissions.service";
import { ArcaCredentialsService } from "../arca-credentials.service";
import type { AmbienteArca } from "../types/arca.types";
import type {
  WsaaSafeResult,
  WsaaServiceName,
  WsaaTicket,
} from "./wsaa.types";

@Injectable()
export class WsaaService {
  private readonly cache =
    new Map<string, WsaaTicket>();

  private readonly pending =
    new Map<string, Promise<WsaaTicket>>();

  constructor(
    private readonly credentials:
      ArcaCredentialsService,
    private readonly permissions:
      PermissionsService,
  ) {}

  private cacheKey(
    comercioId: string,
    ambiente: AmbienteArca,
    servicio: WsaaServiceName,
  ): string {
    return `${comercioId}:${ambiente}:${servicio}`;
  }

  private wsaaUrl(
    ambiente: AmbienteArca,
  ): string {
    return ambiente === "produccion"
      ? "https://wsaa.afip.gov.ar/ws/services/LoginCms"
      : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
  }

  private buildTra(
    servicio: WsaaServiceName,
  ): string {
    const now = Date.now();

    // Margen ante pequeños desfasajes de reloj.
    const generationTime = new Date(
      now - 10 * 60 * 1000,
    ).toISOString();

    // El TRA se usa inmediatamente. El TA devuelto por
    // WSAA tendrá su propia expiración.
    const expirationTime = new Date(
      now + 20 * 60 * 1000,
    ).toISOString();

    const uniqueId =
      Math.floor(now / 1000) >>> 0;

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<loginTicketRequest version="1.0">',
      "<header>",
      `<uniqueId>${uniqueId}</uniqueId>`,
      `<generationTime>${generationTime}</generationTime>`,
      `<expirationTime>${expirationTime}</expirationTime>`,
      "</header>",
      `<service>${servicio}</service>`,
      "</loginTicketRequest>",
    ].join("\n");
  }

  private async runOpenSslCms(params: {
    tra: string;
    certificate: Buffer;
    privateKey: Buffer;
    passphrase: string | null;
  }): Promise<Buffer> {
    const directory = await mkdtemp(
      join(tmpdir(), "drito-wsaa-"),
    );

    const traPath = join(
      directory,
      "LoginTicketRequest.xml",
    );
    const certificatePath = join(
      directory,
      "certificate.pem",
    );
    const privateKeyPath = join(
      directory,
      "private-key.pem",
    );

    try {
      await Promise.all([
        writeFile(
          traPath,
          params.tra,
          { mode: 0o600 },
        ),
        writeFile(
          certificatePath,
          params.certificate,
          { mode: 0o600 },
        ),
        writeFile(
          privateKeyPath,
          params.privateKey,
          { mode: 0o600 },
        ),
      ]);

      const executable =
        process.env.ARCA_OPENSSL_PATH?.trim() ||
        "openssl";

      const args = [
        "cms",
        "-sign",
        "-in",
        traPath,
        "-signer",
        certificatePath,
        "-inkey",
        privateKeyPath,
        "-nodetach",
        "-md",
        "sha1",
        "-outform",
        "DER",
      ];

      if (params.passphrase) {
        args.push(
          "-passin",
          "env:DRITO_OPENSSL_PASS",
        );
      }

      return await new Promise<Buffer>(
        (resolve, reject) => {
          const child = spawn(
            executable,
            args,
            {
              shell: false,
              env: {
                ...process.env,
                ...(params.passphrase
                  ? {
                      DRITO_OPENSSL_PASS:
                        params.passphrase,
                    }
                  : {}),
              },
              stdio: [
                "ignore",
                "pipe",
                "pipe",
              ],
            },
          );

          const stdout: Buffer[] = [];
          const stderr: Buffer[] = [];

          child.stdout.on(
            "data",
            (chunk: Buffer) => {
              stdout.push(Buffer.from(chunk));
            },
          );

          child.stderr.on(
            "data",
            (chunk: Buffer) => {
              stderr.push(Buffer.from(chunk));
            },
          );

          child.once("error", (error) => {
            reject(
              new InternalServerErrorException(
                `No se pudo ejecutar OpenSSL: ${error.message}`,
              ),
            );
          });

          child.once("close", (code) => {
            if (code !== 0) {
              const message = Buffer.concat(
                stderr,
              )
                .toString("utf8")
                .trim();

              reject(
                new InternalServerErrorException(
                  `OpenSSL no pudo firmar el TRA${
                    message
                      ? `: ${message.slice(0, 300)}`
                      : ""
                  }`,
                ),
              );
              return;
            }

            const cms = Buffer.concat(stdout);

            if (cms.length === 0) {
              reject(
                new InternalServerErrorException(
                  "OpenSSL devolvió un CMS vacío",
                ),
              );
              return;
            }

            resolve(cms);
          });
        },
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
    }
  }

  private decodeXmlEntities(
    value: string,
  ): string {
    return value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  private extractTag(
    xml: string,
    tag: string,
  ): string | null {
    const match = new RegExp(
      `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i",
    ).exec(xml);

    return match?.[1]?.trim() ?? null;
  }

  private parseWsaaResponse(
    soapXml: string,
    ambiente: AmbienteArca,
    servicio: WsaaServiceName,
  ): WsaaTicket {
    const fault =
      this.extractTag(
        soapXml,
        "faultstring",
      );

    if (fault) {
      throw new BadGatewayException(
        `WSAA rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const returnMatch =
      /<(?:\w+:)?loginCmsReturn[^>]*>([\s\S]*?)<\/(?:\w+:)?loginCmsReturn>/i.exec(
        soapXml,
      );

    if (!returnMatch) {
      throw new BadGatewayException(
        "WSAA respondió sin loginCmsReturn",
      );
    }

    const ticketXml =
      this.decodeXmlEntities(
        returnMatch[1].trim(),
      );

    const token =
      this.extractTag(ticketXml, "token");
    const sign =
      this.extractTag(ticketXml, "sign");
    const generationTimeText =
      this.extractTag(
        ticketXml,
        "generationTime",
      );
    const expirationTimeText =
      this.extractTag(
        ticketXml,
        "expirationTime",
      );

    if (
      !token ||
      !sign ||
      !generationTimeText ||
      !expirationTimeText
    ) {
      throw new BadGatewayException(
        "El Ticket de Acceso de WSAA está incompleto",
      );
    }

    const generationTime =
      new Date(generationTimeText);
    const expirationTime =
      new Date(expirationTimeText);

    if (
      Number.isNaN(generationTime.getTime()) ||
      Number.isNaN(expirationTime.getTime())
    ) {
      throw new BadGatewayException(
        "WSAA devolvió fechas inválidas en el Ticket de Acceso",
      );
    }

    return {
      ambiente,
      servicio,
      token,
      sign,
      generationTime,
      expirationTime,
    };
  }

  private isUsable(
    ticket: WsaaTicket,
  ): boolean {
    const safetyWindowMs =
      5 * 60 * 1000;

    return (
      ticket.expirationTime.getTime() -
        Date.now() >
      safetyWindowMs
    );
  }

  private async requestNewTicket(
    comercioId: string,
    ambiente: AmbienteArca,
    servicio: WsaaServiceName,
  ): Promise<WsaaTicket> {
    const loaded =
      await this.credentials
        .loadCredentialsForBackend(
          comercioId,
          ambiente,
        );

    try {
      const tra = this.buildTra(servicio);

      const cmsDer =
        await this.runOpenSslCms({
          tra,
          certificate:
            loaded.certificate,
          privateKey:
            loaded.privateKey,
          passphrase:
            loaded.passphrase,
        });

      try {
        const cmsBase64 =
          cmsDer.toString("base64");

        const soap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">',
          "<soapenv:Header/>",
          "<soapenv:Body>",
          "<wsaa:loginCms>",
          `<wsaa:in0>${cmsBase64}</wsaa:in0>`,
          "</wsaa:loginCms>",
          "</soapenv:Body>",
          "</soapenv:Envelope>",
        ].join("");

        const response = await fetch(
          this.wsaaUrl(ambiente),
          {
            method: "POST",
            headers: {
              "Content-Type":
                "text/xml;charset=UTF-8",
              SOAPAction: "urn:LoginCms",
            },
            body: soap,
            signal: AbortSignal.timeout(
              20_000,
            ),
          },
        );

        const responseText =
          await response.text();

        if (!response.ok) {
          const fault =
            this.extractTag(
              responseText,
              "faultstring",
            );

          throw new BadGatewayException(
            fault
              ? `WSAA rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
              : `WSAA respondió HTTP ${response.status}`,
          );
        }

        return this.parseWsaaResponse(
          responseText,
          ambiente,
          servicio,
        );
      } finally {
        cmsDer.fill(0);
      }
    } finally {
      loaded.privateKey.fill(0);
      loaded.certificate.fill(0);
      loaded.passphrase = null;
    }
  }

  async getTicketForBackend(
    comercioId: string,
    ambiente: AmbienteArca,
    servicio: WsaaServiceName = "wsfe",
  ): Promise<{
    ticket: WsaaTicket;
    fromCache: boolean;
  }> {
    const key = this.cacheKey(
      comercioId,
      ambiente,
      servicio,
    );

    const cached = this.cache.get(key);

    if (cached && this.isUsable(cached)) {
      return {
        ticket: cached,
        fromCache: true,
      };
    }

    if (cached) {
      this.cache.delete(key);
    }

    const existing = this.pending.get(key);

    if (existing) {
      return {
        ticket: await existing,
        fromCache: false,
      };
    }

    const request =
      this.requestNewTicket(
        comercioId,
        ambiente,
        servicio,
      );

    this.pending.set(key, request);

    try {
      const ticket = await request;
      this.cache.set(key, ticket);

      return {
        ticket,
        fromCache: false,
      };
    } finally {
      this.pending.delete(key);
    }
  }

  async authenticate(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ): Promise<WsaaSafeResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    const { ticket, fromCache } =
      await this.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    return {
      ok: true,
      ambiente,
      servicio: "wsfe",
      ticket: "vigente",
      origen:
        fromCache ? "cache" : "wsaa",
      generationTime:
        ticket.generationTime.toISOString(),
      expirationTime:
        ticket.expirationTime.toISOString(),
    };
  }
}
