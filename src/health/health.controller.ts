import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "../shared/decorators/public.decorator";

@Controller("health")
@ApiTags("Health Check")
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dbNoSQL: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService
  ) {}

  @Get("database")
  @HealthCheck()
  @ApiOperation({ summary: "DB Health Indicator" })
  checkDatabase() {
    return this.health.check([() => this.dbNoSQL.pingCheck(this.configService.get<string>("DATABASE"))]);
  }

  @Get("memory")
  @HealthCheck()
  @ApiOperation({ summary: "Memory Health Indicator" })
  checkMemory() {
    const memSize = 150 * 1024 * 1024; // 150MB

    return this.health.check([
      () => this.memory.checkHeap("memory_heap", memSize),
      () => this.memory.checkRSS("memory_rss", memSize),
    ]);
  }

  /**
   * Readiness probe — returns 200 when service is ready to serve traffic.
   */
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  async ready(): Promise<{ status: string }> {
    return { status: "ok" };
  }
}
