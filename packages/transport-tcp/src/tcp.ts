import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { TcpBackend } from './client/backend';
import { TcpClient } from './client/clinet';
import { DelimiterProtocol, PacketProtocol } from './packet';
import { TcpProtocol } from './protocol';
import { TcpHandlerBinding } from './server/binding';
import { TcpServerOpts } from './server/options';
import { TcpRespondAdapter } from './server/respond';
import { TcpServer } from './server/server';
import { TcpStatus } from './status';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        { provide: PacketProtocol, useClass: DelimiterProtocol },
        TcpStatus,
        TcpProtocol,
        TcpBackend,
        
        TcpRespondAdapter,
        TcpHandlerBinding,
        
        TcpClient,
        TcpServer
    ]
})
export class TcpModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: TcpServerOpts): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [{ provide: TcpServerOpts, useValue: options }];
        return {
            module: TcpModule,
            providers
        }
    }
}
