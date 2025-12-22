import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { CLIENT_CONFIGS, provideClientFromDi } from '@tsdi/common/client';
import { provideServiceFromDi, SERVICE_CONFIGS } from '@tsdi/endpoints';

import { tcpTransportFactory } from './server/server';
import { TcpServConfig } from './server/options';
import { TcpClientConfig } from './client/options';
import { tcpClientTransportFacotry } from './client/client';
@Module({
    providers: [
        provideClientFromDi({ transport: Transport.TCP })
    ]
})
export class TcpClientModule {

    static withOptions(options: TcpClientConfig): ModuleWithProviders<TcpClientModule> {
        if (!options.transportFeature) options.transportFeature = tcpClientTransportFacotry;
        return {
            module: TcpClientModule,
            providers: [
                { provide: CLIENT_CONFIGS, useValue: options, multi: true }
            ]
        }
    }
}


@Module({
    providers: [
        provideServiceFromDi({ transport: Transport.TCP })
    ]
})
export class TcpModule {

    static withOptions(options: TcpServConfig): ModuleWithProviders<TcpModule> {
        if (!options.transportFeature) options.transportFeature = tcpTransportFactory;
        return {
            module: TcpModule,
            providers: [
                { provide: SERVICE_CONFIGS, useValue: options, multi: true }
            ]
        }
    }
}


