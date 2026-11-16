import { Inject, Optional } from '@tsdi/ioc';
import { Controller, Get, ReadinessStateService } from '@tsdi/service';
import { StatusMessageAdapter } from '@tsdi/common';
import { HealthIndicator } from './indicator';
import { HealthOptions, HealthReport, HealthResult } from './health';
import { HEALTH_INDICATORS, HEALTH_OPTIONS } from './tokens';

/**
 * Health check controller.
 *
 * 健康检查控制器，提供 /health、/health/liveness、/health/readiness 端点。
 */
@Controller('/health')
export class HealthController {
    constructor(
        @Inject(HEALTH_INDICATORS) private indicators: HealthIndicator[],
        @Optional() @Inject(HEALTH_OPTIONS) private options?: HealthOptions,
        @Optional() @Inject(ReadinessStateService) private readinessState?: ReadinessStateService
    ) {}

    /**
     * full health check.
     * @returns health report.
     */
    @Get('/')
    async check(
        @Optional() @Inject(StatusMessageAdapter) adapter?: StatusMessageAdapter
    ): Promise<HealthReport> {
        const results = await this.checkAll();
        const allUp = Object.values(results).every(r => r.status === 'UP');
        const report: HealthReport = {
            status: allUp ? 'UP' : 'DOWN',
            timestamp: new Date().toISOString(),
            components: results
        };
        this.applyStatus(adapter, report.status);
        return this.redact(report);
    }

    /**
     * liveness probe for Kubernetes.
     *
     * Liveness only answers "is the process alive"; it intentionally does not
     * run dependency checks and always returns 200 while the process serves.
     * @returns simple UP status.
     */
    @Get('/liveness')
    liveness(): { status: 'UP' } {
        return { status: 'UP' };
    }

    /**
     * readiness probe for Kubernetes.
     *
     * Returns 503 while the instance is starting or draining, and when any
     * indicator is DOWN, so load balancers stop routing to this instance.
     * @returns health report.
     */
    @Get('/readiness')
    async readiness(
        @Optional() @Inject(StatusMessageAdapter) adapter?: StatusMessageAdapter
    ): Promise<HealthReport> {
        const phase = this.readinessState?.current;
        if (phase && phase !== 'UP') {
            const report: HealthReport = {
                status: 'DOWN',
                timestamp: new Date().toISOString(),
                components: {
                    lifecycle: { status: 'DOWN', error: `service is ${phase}` }
                }
            };
            this.applyStatus(adapter, report.status);
            return this.redact(report);
        }
        return this.check(adapter);
    }

    private async checkAll(): Promise<Record<string, HealthResult>> {
        const indicators = this.indicators ?? [];
        const pairs = await Promise.all(indicators.map(async indicator => {
            const result = await this.invokeWithTimeout(indicator);
            return [indicator.name, result] as const;
        }));
        return Object.fromEntries(pairs);
    }

    private async invokeWithTimeout(indicator: HealthIndicator): Promise<HealthResult> {
        const timeoutMs = this.options?.timeout;
        if (!timeoutMs || timeoutMs <= 0) {
            return this.invokeIndicator(indicator);
        }
        let timer: any;
        try {
            return await Promise.race([
                this.invokeIndicator(indicator),
                new Promise<HealthResult>(resolve => {
                    timer = setTimeout(
                        () => resolve({ status: 'DOWN', error: `timeout after ${timeoutMs}ms` }),
                        timeoutMs
                    );
                    timer?.unref?.();
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    private async invokeIndicator(indicator: HealthIndicator): Promise<HealthResult> {
        try {
            return await indicator.check();
        } catch (err) {
            return {
                status: 'DOWN',
                error: err instanceof Error ? err.message : String(err)
            };
        }
    }

    private redact(report: HealthReport): HealthReport {
        if (this.options?.includeDetails !== false) {
            return report;
        }
        const components: Record<string, HealthResult> = {};
        for (const [name, result] of Object.entries(report.components)) {
            components[name] = { status: result.status, error: result.error };
        }
        return { ...report, components };
    }

    private applyStatus(adapter: StatusMessageAdapter | undefined, status: string): void {
        try {
            adapter?.setStatus?.(status === 'DOWN' ? 503 : 200);
        } catch {
            // Adapters without an HTTP status (e.g. brokers) are ignored.
        }
    }
}
