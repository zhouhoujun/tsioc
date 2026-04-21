import { Abstract } from '@tsdi/ioc';
import { HealthResult } from './health';

/**
 * Health indicator abstract class.
 *
 * 健康指示器抽象类，用于检查特定组件的健康状态。
 */
@Abstract()
export abstract class HealthIndicator {
    /**
     * indicator name.
     */
    abstract get name(): string;

    /**
     * check health status.
     * @returns health result.
     */
    abstract check(): Promise<HealthResult>;
}