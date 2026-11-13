import { token } from '@tsdi/ioc';
import { MetricsModuleOptions } from './metrics';

/**
 * Metrics module options token.
 */
export const METRICS_OPTIONS = token<MetricsModuleOptions>('METRICS_OPTIONS');
