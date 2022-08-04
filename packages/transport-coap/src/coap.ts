import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { CoapClient } from './client/client';
import { CoapServer, CoapServerOpts } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        CoapClient,
        CoapServer
    ]
})
export class CoapModule {

    /**
     * Udp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: CoapServerOpts): ModuleWithProviders<CoapModule> {
        const providers: ProviderType[] = [{ provide: CoapServerOpts, useValue: options }];
        return {
            module: CoapModule,
            providers
        }
    }
}
