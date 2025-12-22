import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
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

    static withOptions(...options: TcpClientOptions[]): ModuleWithProviders<TcpClientModule> {
        const providers = options.map(r => {
            if (!r.transportFeature) r.transportFeature = tcpClientTransportFacotry;
            return { provide: CLIENT_CONFIGS, useValue: options, multi: true } as Provider
        });
        return {
            module: TcpClientModule,
            providers
        }
    }
}


@Module({
    providers: [
        provideServiceFromDi({ transport: Transport.TCP })
    ]
})
export class TcpModule {

    static withOptions(...options: TcpServOptions[]): ModuleWithProviders<TcpModule> {
        const providers = options.map(r => {
            if (!r.transportFeature) r.transportFeature = tcpTransportFactory;
            return { provide: SERVICE_CONFIGS, useValue: options, multi: true } as Provider
        });
        return {
            module: TcpModule,
            providers
        }
    }
}


