import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TcpClient } from './client/clinet';
import { TcpServer, TcpServerOptions } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
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
    static withOptions(options: TcpServerOptions): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [{ provide: TcpServerOptions, useValue: options }];
        return {
            module: TcpModule,
            providers
        }
    }
}
