import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { CatchInterceptor, LogInterceptor } from '../interceptors';
import { TcpClient } from './clinet';
import { TcpServer, TcpServerOptions, TCP_SERV_INTERCEPTORS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: TCP_SERV_INTERCEPTORS, useClass: LogInterceptor, multi: true },
        { provide: TCP_SERV_INTERCEPTORS, useClass: CatchInterceptor, multi: true },
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
