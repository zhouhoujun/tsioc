import { Module, RouterModule, TransformModule, TransportClient, TransportServer } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from './mime';
import { ProtocolClient } from './client/client';
import { ProtocolServerOpts } from './server/options';
import { ProtocolServer } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: MimeDb, useClass: BasicMimeDb, asDefault: true },
        ProtocolClient,
        ProtocolServer,
        { provide: TransportClient, useClass: ProtocolClient },
        { provide: TransportServer, useClass: ProtocolServer }
    ]
})
export class TransportModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: ProtocolServerOpts): ModuleWithProviders<TransportModule> {
        const providers: ProviderType[] = [{ provide: ProtocolServerOpts, useValue: options }];
        return {
            module: TransportModule,
            providers
        }
    }
}
