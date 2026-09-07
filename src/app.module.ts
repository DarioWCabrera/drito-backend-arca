import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerModule,
} from "@nestjs/throttler";
import { ArcaModule } from "./arca/arca.module";
import { DritoAssistantModule } from "./drito-assistant/drito-assistant.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    ArcaModule,
    DritoAssistantModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}