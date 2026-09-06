import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArcaModule } from "./arca/arca.module";
import { DritoAssistantModule } from "./drito-assistant/drito-assistant.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ArcaModule,
    DritoAssistantModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
