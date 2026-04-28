import { token } from '@tsdi/ioc';
import { HealthIndicator } from './indicator';

/**
 * Health indicators multi token.
 */
export const HEALTH_INDICATORS = token<HealthIndicator[]>('HEALTH_INDICATORS');