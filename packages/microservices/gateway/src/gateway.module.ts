import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { GatewayInterceptor } from './gateway.interceptor';
import { GatewayOptions, GATEWAY_OPTIONS } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { ConfigurationManagerGatewayAdapter, GatewayConfigAdapter, GATEWAY_CONFIG_ADAPTER_OPTIONS } from './gateway.config-adapter';

@Module({
    providers: [
        GatewayRuntime,
        { provide: GATEWAY_CONFIG_ADAPTER_OPTIONS, useValue: undefined },
        ConfigurationManagerGatewayAdapter,
        { provide: GatewayConfigAdapter, useExisting: ConfigurationManagerGatewayAdapter },
        GatewayLifecycle,
        GatewayInterceptor
    ],
    exports: [GatewayRuntime, GatewayConfigAdapter, GatewayLifecycle, GatewayInterceptor]
})
export class GatewayModule {
    static withOptions(options: GatewayOptions): ModuleWithProviders<GatewayModule> {
        return {
            module: GatewayModule,
            providers: [
                GatewayRuntime,
                { provide: GATEWAY_CONFIG_ADAPTER_OPTIONS, useValue: options.configSync },
                ConfigurationManagerGatewayAdapter,
                { provide: GatewayConfigAdapter, useExisting: ConfigurationManagerGatewayAdapter },
                GatewayLifecycle,
                { provide: GATEWAY_OPTIONS, useValue: options }
            ]
        };
    }
}
