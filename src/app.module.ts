import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArcaModule } from "./arca/arca.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ArcaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
