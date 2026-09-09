import "reflect-metadata";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./validate-environment";

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    rawBody: false,
  });

  app
  .getHttpAdapter()
  .getInstance()
  .set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const allowedOrigins = (
    process.env.DRITO_FRONTEND_URLS ?? ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    credentials: true,
    origin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
      // Permite herramientas server-to-server sin Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: [
      "GET",
      "POST",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port, "0.0.0.0");

  console.log(
    `Drito ARCA backend escuchando en puerto ${port}`,
  );
}

void bootstrap();
