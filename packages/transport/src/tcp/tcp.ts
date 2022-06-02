import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TcpClient } from './clinet';
import { TcpServer, TcpServerOptions } from './server';

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

    static withOptions(options: TcpServerOptions): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [{ provide: TcpServerOptions, useValue: options }];
        return {
            module: TcpModule,
            providers
        }
    }
}
