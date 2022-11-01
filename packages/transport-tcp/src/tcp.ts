import { Module, RouterModule, StatusFactory, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { HttpStatusFactory } from '@tsdi/transport-http';
import { TcpClient } from './client/clinet';
import { TcpVaildator, TcpPackFactory } from './transport';
import { TcpServerOpts } from './server/options';
import { TcpServer } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        TcpVaildator,
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
