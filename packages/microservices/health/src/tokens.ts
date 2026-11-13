import { token } from '@tsdi/ioc';
import { HealthIndicator } from './indicator';
import { HealthOptions } from './health';

/**
 * Health indicators multi token.
 */
export const HEALTH_INDICATORS = token<HealthIndicator[]>('HEALTH_INDICATORS');

/**
 * Health check options token.
 */
export const HEALTH_OPTIONS = token<HealthOptions>('HEALTH_OPTIONS');
