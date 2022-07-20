import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { UdpClient } from './client/client';
import { UdpServer, UdpServerOpts } from './server/server';

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
    static withOptions(options: UdpServerOpts): ModuleWithProviders<UdpModule> {
        const providers: ProviderType[] = [{ provide: UdpServerOpts, useValue: options }];
        return {
            module: UdpModule,
            providers
        }
    }
}
