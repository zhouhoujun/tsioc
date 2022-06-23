import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { UdpClient } from './client/client';
import { UdpServer, UdpServerOptions } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        UdpClient,
        UdpServer
    ]
})
export class UdpModule {

    /**
     * Udp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: UdpServerOptions): ModuleWithProviders<UdpModule> {
        const providers: ProviderType[] = [{ provide: UdpServerOptions, useValue: options }];
        return {
            module: UdpModule,
            providers
        }
    }
}
