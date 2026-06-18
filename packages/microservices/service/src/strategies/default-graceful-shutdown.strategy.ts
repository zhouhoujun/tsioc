import { Inject, Injectable } from '@tsdi/ioc';
import { GracefulShutdownOptions } from '../features/GracefulShutdownOptions';
import { SERVICE_GRACEFUL_SHUTDOWN_OPTIONS } from '../provider';
import { IHealthCheckStrategy, HEALTH_CHECK_STRATEGY } from './IHealthCheckStrategy';
import { IGracefulShutdownStrategy } from './IGracefulShutdownStrategy';

@Injectable()
export class DefaultGracefulShutdownStrategy implements IGracefulShutdownStrategy {
    constructor(
        @Inject(SERVICE_GRACEFUL_SHUTDOWN_OPTIONS, { nullable: true }) private options: GracefulShutdownOptions | null,
        @Inject(HEALTH_CHECK_STRATEGY, { nullable: true }) private healthStrategy: IHealthCheckStrategy | null
    ) {}

    async shutdown(): Promise<void> {
        if (this.options?.enabled === false) {
            return;
        }
        await this.healthStrategy?.stop();

        if (this.options?.waitDuration && this.options.waitDuration > 0) {
            await new Promise<void>(resolve => setTimeout(resolve, this.options!.waitDuration));
        }
    }
}
