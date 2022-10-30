import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { CoapClient } from './client/client';
import { CoapVaildator } from './transport';
import { CoapServer, CoapServerOpts } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        CoapVaildator,
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
