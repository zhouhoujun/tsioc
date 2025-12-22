import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { CLIENT_CONFIGS, provideClientFromDi } from '@tsdi/common/client';
import { provideServiceFromDi, SERVICE_CONFIGS } from '@tsdi/endpoints';

import { tcpTransportFactory } from './server/server';
import { TcpServOptions } from './server/options';
import { TcpClientOptions } from './client/options';
import { tcpClientTransportFacotry } from './client/client';
@Module({
    providers: [
        provideClientFromDi({ transport: Transport.TCP })
    ]
})
export class TcpClientModule {

    static withOptions(options: TcpClientOptions): ModuleWithProviders<TcpClientModule> {
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

    static withOptions(options: TcpServOptions): ModuleWithProviders<TcpModule> {
        if (!options.transportFeature) options.transportFeature = tcpTransportFactory;
        return {
            module: TcpModule,
            providers: [
                { provide: SERVICE_CONFIGS, useValue: options, multi: true }
            ]
        }
    }
}


