import { Inject, Injectable } from '@tsdi/ioc';
import { HealthIndicator } from '../../../health/src/indicator';
import { HealthResult } from '../../../health/src/health';
import { ServiceDiscovery } from '@tsdi/discovery';
import { HEALTH_INDICATORS } from '../../../health/src/tokens';
import { HealthOptions } from '../features/HealthOptions';
import { SERVICE_HEALTH_OPTIONS } from '../provider';
import { DiscoveryRegistrationStrategy } from './discovery-registration.strategy';
import { IHealthCheckStrategy } from './IHealthCheckStrategy';

@Injectable()
export class DiscoveryHealthCheckStrategy implements IHealthCheckStrategy {
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        @Inject(ServiceDiscovery, { nullable: true }) private discovery: ServiceDiscovery | null,
        @Inject(HEALTH_INDICATORS, { nullable: true }) private indicators: HealthIndicator[] | null,
        @Inject(SERVICE_HEALTH_OPTIONS, { nullable: true }) private options: HealthOptions | null,
        @Inject(DiscoveryRegistrationStrategy, { nullable: true }) private registration: DiscoveryRegistrationStrategy | null
    ) {}

    async start(): Promise<void> {
        if (!this.discovery || this.options?.enabled === false) {
            return;
        }
        await this.report();
        const interval = this.options?.checkInterval;
        if (interval && interval > 0) {
            this.timer = setInterval(() => {
                this.report().catch(() => undefined);
            }, interval);
        }
    }

    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        const endpoint = this.registration?.getEndpoint();
        if (this.discovery && endpoint) {
            await this.discovery.update(endpoint.id, { status: 'DOWN' });
        }
    }

    private async report(): Promise<void> {
        const endpoint = this.registration?.getEndpoint();
        if (!this.discovery || !endpoint) {
            return;
        }
        const report = await this.checkIndicators();
        await this.discovery.update(endpoint.id, {
            status: report.status,
            metadata: {
                ...(endpoint.metadata ?? {}),
                health: report
            }
        });
    }

    private async checkIndicators(): Promise<HealthResult> {
        const indicators = this.indicators ?? [];
        const details: Record<string, any> = {};
        let status: 'UP' | 'DOWN' | 'UNKNOWN' = indicators.length ? 'UP' : 'UNKNOWN';
        for (const indicator of indicators) {
            try {
                const result = await indicator.check();
                details[indicator.name] = result;
                if (result.status !== 'UP') {
                    status = 'DOWN';
                }
            } catch (err) {
                details[indicator.name] = {
                    status: 'DOWN',
                    error: err instanceof Error ? err.message : String(err)
                };
                status = 'DOWN';
            }
        }
        return { status, details };
    }
}
