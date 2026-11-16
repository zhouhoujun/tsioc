import { Inject, Injectable } from '@tsdi/ioc';
import { InFlightTracker } from '../InFlightTracker';
import { GracefulShutdownOptions } from '../features/GracefulShutdownOptions';
import { SERVICE_GRACEFUL_SHUTDOWN_OPTIONS } from '../tokens';
import { IHealthCheckStrategy, HEALTH_CHECK_STRATEGY } from './IHealthCheckStrategy';
import { IGracefulShutdownStrategy } from './IGracefulShutdownStrategy';

/**
 * Default in-flight drain deadline, matches the documented `timeout` default.
 */
const DEFAULT_DRAIN_TIMEOUT = 30000;

@Injectable()
export class DefaultGracefulShutdownStrategy implements IGracefulShutdownStrategy {
    constructor(
        @Inject(SERVICE_GRACEFUL_SHUTDOWN_OPTIONS, { nullable: true }) private options: GracefulShutdownOptions | null,
        @Inject(HEALTH_CHECK_STRATEGY, { nullable: true }) private healthStrategy: IHealthCheckStrategy | null,
        @Inject(InFlightTracker, { nullable: true }) private tracker?: InFlightTracker | null
    ) {}

    async shutdown(): Promise<void> {
        if (this.options?.enabled === false) {
            return;
        }

        // Readiness DOWN first so discovery/load balancers stop selecting this
        // instance while requests still in flight can finish.
        await this.healthStrategy?.stop();

        // Give the registry and load balancers time to observe the DOWN state.
        if (this.options?.waitDuration && this.options.waitDuration > 0) {
            await new Promise<void>(resolve => setTimeout(resolve, this.options!.waitDuration));
        }

        // Wait for requests currently being processed, bounded by the drain
        // deadline so a stuck handler cannot block shutdown forever.
        if (this.tracker) {
            const timeout = this.options?.drainTimeoutMs ?? this.options?.timeout ?? DEFAULT_DRAIN_TIMEOUT;
            await this.tracker.drain(timeout);
        }
    }
}
