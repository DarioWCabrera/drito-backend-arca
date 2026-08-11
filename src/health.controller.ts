import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "drito-backend-arca",
      timestamp: new Date().toISOString(),
    };
  }
}
