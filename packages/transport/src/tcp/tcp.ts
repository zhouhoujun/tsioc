import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TcpClient } from './clinet';
import { TcpServer } from './server';

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

    static withOptions(): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [];
        return {
            module: TcpModule,
            providers
        }
    }

}
