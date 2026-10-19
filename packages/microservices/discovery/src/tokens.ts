import { token } from '@tsdi/ioc';
import type { ServiceDiscoveryOptions } from './discovery';

/**
 * Service discovery options token.
 *
 * Kept outside `discovery.module.ts` so implementations (which the module
 * imports for its provider list) can inject the options without creating a
 * circular value import.
 */
export const DISCOVERY_OPTIONS = token<ServiceDiscoveryOptions>('DISCOVERY_OPTIONS');
