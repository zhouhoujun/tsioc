import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { ServiceDiscovery } from './registry';
import { InMemoryServiceDiscovery } from './memory.discovery';
import { LeastConnectionsEndpointSelector, RandomEndpointSelector, RoundRobinEndpointSelector, WeightedEndpointSelector } from './selector';
import { EndpointSelector } from './registry';
import { ServiceDiscoveryOptions } from './discovery';
import { DISCOVERY_OPTIONS } from './tokens';
import { DefaultEndpointResolver, EndpointResolver } from './endpoint-resolver';

export { DISCOVERY_OPTIONS } from './tokens';

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
    { provide: EndpointSelector, useClass: RoundRobinEndpointSelector },
    DefaultEndpointResolver,
    { provide: EndpointResolver, useExisting: DefaultEndpointResolver }
];

/**
 * Discovery module.
 *
 * 服务发现模块，提供服务注册和发现能力。
 */
@Module({
    providers: DISCOVERY_PROVIDERS,
    exports: [InMemoryServiceDiscovery, RandomEndpointSelector, RoundRobinEndpointSelector, WeightedEndpointSelector, LeastConnectionsEndpointSelector, DefaultEndpointResolver, EndpointResolver]
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
