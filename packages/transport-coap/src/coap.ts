import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { CoapClient } from './client/client';
import { CoapProtocol } from './protocol';
import { CoapServer, CoapServerOpts } from './server/server';
import { CoapStatus } from './status';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        CoapProtocol,
        CoapStatus,
        CoapProtocol,
        CoapClient,
        CoapServer
    ]
})
export class CoapModule {

    /**
     * CoAP Server options.
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
