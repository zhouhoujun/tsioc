import { Inject } from '@tsdi/ioc';
import { Controller, Get } from '@tsdi/service';
import { HealthIndicator } from './indicator';
import { HealthReport, HealthResult } from './health';
import { HEALTH_INDICATORS } from './tokens';

/**
 * Health check controller.
 *
 * 健康检查控制器，提供 /health、/health/liveness、/health/readiness 端点。
 */
@Controller('/health')
export class HealthController {
    constructor(
        @Inject(HEALTH_INDICATORS) private indicators: HealthIndicator[]
    ) {}

    /**
     * full health check.
     * @returns health report.
     */
    @Get()
    async check(): Promise<HealthReport> {
        const results: Record<string, HealthResult> = {};

        for (const indicator of this.indicators) {
            try {
                results[indicator.name] = await indicator.check();
            } catch (err) {
                results[indicator.name] = {
                    status: 'DOWN',
                    error: err instanceof Error ? err.message : String(err)
                };
            }
        }

        const allUp = Object.values(results).every(r => r.status === 'UP');
        return {
            status: allUp ? 'UP' : 'DOWN',
            timestamp: new Date().toISOString(),
            components: results
        };
    }

    /**
     * liveness probe for Kubernetes.
     * 用于检测服务是否存活。
     * @returns simple UP status.
     */
    @Get('/liveness')
    liveness(): { status: 'UP' } {
        return { status: 'UP' };
    }

    /**
     * readiness probe for Kubernetes.
     * 用于检测服务是否准备好接收请求。
     * @returns health report.
     */
    @Get('/readiness')
    async readiness(): Promise<HealthReport> {
        return this.check();
    }
}