import { Module, RouterModule, StatusFactory, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { TcpClient } from './client/clinet';
import { TcpIncomingUtil, TcpPackFactory } from './transport';
import { TcpServerOpts } from './server/options';
import { TcpServer } from './server/server';
import { HttpStatusFactory } from '@tsdi/transport-http';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        TcpIncomingUtil,
        TcpPackFactory,
        TcpClient,
        TcpServer,
        { provide: StatusFactory, useClass: HttpStatusFactory, asDefault: true }
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
