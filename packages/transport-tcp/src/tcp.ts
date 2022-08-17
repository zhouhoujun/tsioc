import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { TcpClientBuilder } from './client/builder';
import { TcpClient } from './client/clinet';
import { TcpProtocol } from './protocol';
import { TcpServerBuilder } from './server/builder';
import { TcpServerOpts } from './server/options';
import { TcpServer } from './server/server';
import { TcpStatus } from './status';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        TcpStatus,
        TcpProtocol,
        TcpClientBuilder,
        TcpServerBuilder,
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
