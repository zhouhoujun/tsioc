/**
 * Health status type.
 */
export type HealthStatus = 'UP' | 'DOWN' | 'UNKNOWN';

/**
 * Health details interface.
 */
export interface HealthDetails {
    [key: string]: any;
}

/**
 * Health result interface.
 */
export interface HealthResult {
    /**
     * health status.
     */
    status: HealthStatus;
    /**
     * health details.
     */
    details?: HealthDetails;
    /**
     * error message.
     */
    error?: string;
}

/**
 * Health report interface.
 */
export interface HealthReport {
    /**
     * overall health status.
     */
    status: HealthStatus;
    /**
     * timestamp of the health check.
     */
    timestamp: string;
    /**
     * health check results for each component.
     */
    components: Record<string, HealthResult>;
}

/**
 * Health check options.
 */
export interface HealthOptions {
    /**
     * timeout in milliseconds for each health check.
     */
    timeout?: number;
    /**
     * include details in the response.
     */
    includeDetails?: boolean;
}