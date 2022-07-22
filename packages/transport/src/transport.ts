import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from './mime';
import {TransportProtocolClient } from './client/client';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: MimeDb, useClass: BasicMimeDb, asDefault: true },
        // { provide: PacketProtocol, useClass: DelimiterProtocol, asDefault: true },
        TransportProtocolClient,
        // TcpServer
    ]
})
export class TcpModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: ProtocolServerOpts): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [{ provide: TcpServerOpts, useValue: options }];
        return {
            module: TcpModule,
            providers
        }
    }
}
