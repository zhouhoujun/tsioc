import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { GatewayInterceptor } from './gateway.interceptor';
import { GatewayOptions, GATEWAY_OPTIONS } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { GatewayConfigService } from './gateway.config.service';
import { ConfigurationManagerGatewayAdapter, GatewayConfigAdapter, GATEWAY_CONFIG_ADAPTER_OPTIONS } from './gateway.config-adapter';
import { resolveGatewayDiscoveryProviders } from './provider';

@Module({
    providers: [
        GatewayRuntime,
        ConfigurationManagerGatewayAdapter,
        { provide: GatewayConfigAdapter, useExisting: ConfigurationManagerGatewayAdapter },
        GatewayLifecycle,
        GatewayConfigService,
        GatewayInterceptor
    ],
    exports: [GatewayRuntime, GatewayConfigAdapter, GatewayLifecycle, GatewayConfigService, GatewayInterceptor]
})
export class GatewayModule {
    static withOptions(options: GatewayOptions): ModuleWithProviders<GatewayModule> {
        return {
            module: GatewayModule,
            providers: [
                ...resolveGatewayDiscoveryProviders(options.discovery),
                GatewayRuntime,
                { provide: GATEWAY_CONFIG_ADAPTER_OPTIONS, useValue: options.configSync },
                ConfigurationManagerGatewayAdapter,
                { provide: GatewayConfigAdapter, useExisting: ConfigurationManagerGatewayAdapter },
                GatewayLifecycle,
                GatewayConfigService,
                { provide: GATEWAY_OPTIONS, useValue: options }
            ]
        };
    }
}
