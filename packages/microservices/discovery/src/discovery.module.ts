import { Module, ModuleWithProviders, Provider, token } from '@tsdi/ioc';
import { ServiceDiscovery } from './registry';
import { InMemoryServiceDiscovery } from './memory.discovery';
import { LeastConnectionsEndpointSelector, RandomEndpointSelector, RoundRobinEndpointSelector, WeightedEndpointSelector } from './selector';
import { EndpointSelector } from './registry';
import { ServiceDiscoveryOptions } from './discovery';

/**
 * Service discovery options token.
 */
export const DISCOVERY_OPTIONS = token<ServiceDiscoveryOptions>('DISCOVERY_OPTIONS');

/**
 * Service discovery providers.
 */
export const DISCOVERY_PROVIDERS: Provider[] = [
    InMemoryServiceDiscovery,
    { provide: ServiceDiscovery, useClass: InMemoryServiceDiscovery },
    RandomEndpointSelector,
    RoundRobinEndpointSelector,
    WeightedEndpointSelector,
    LeastConnectionsEndpointSelector,
    { provide: EndpointSelector, useClass: RoundRobinEndpointSelector }
];

/**
 * Discovery module.
 *
 * 服务发现模块，提供服务注册和发现能力。
 */
@Module({
    providers: DISCOVERY_PROVIDERS,
    exports: [InMemoryServiceDiscovery, RandomEndpointSelector, RoundRobinEndpointSelector, WeightedEndpointSelector, LeastConnectionsEndpointSelector]
})
export class DiscoveryModule {
    /**
     * create discovery module with options.
     * @param options discovery options.
     */
    static withOptions(options: ServiceDiscoveryOptions): ModuleWithProviders<DiscoveryModule> {
        return {
            module: DiscoveryModule,
            providers: [
                { provide: DISCOVERY_OPTIONS, useValue: options }
            ]
        };
    }

    /**
     * use custom endpoint selector.
     * @param selector endpoint selector implementation type.
     */
    static withSelector(selector: typeof RoundRobinEndpointSelector): ModuleWithProviders<DiscoveryModule> {
        return {
            module: DiscoveryModule,
            providers: [
                selector,
                { provide: EndpointSelector, useClass: selector }
            ]
        };
    }
}
