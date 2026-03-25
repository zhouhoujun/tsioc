import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { PatternFormatter, TransferSide, Transport } from '@tsdi/common';
import { CLIENT_CONFIGS, provideClientFromDi } from '@tsdi/common/client';
import { provideServiceFromDi, SERVICE_CONFIGS } from '@tsdi/endpoints';

import { tcpTransportFactory } from './server/server';
import { TcpServOptions } from './server/options';
import { TcpClientOptions } from './client/options';
import { tcpClientTransportFacotry } from './client/client';
import { TcpPatternFormatter } from './pattern';



@Module({
    providers: [
        provideClientFromDi({ transport: Transport.TCP }),
        TcpPatternFormatter,
        { provide: PatternFormatter, useExisting: TcpPatternFormatter }
    ]
})
export class TcpClientModule {

    static withOptions(...options: Partial<TcpClientOptions>[]): ModuleWithProviders<TcpClientModule> {
        const providers = options.map(r => {
            r.transport = Transport.TCP;
            r.side = TransferSide.client;
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
        provideServiceFromDi({ transport: Transport.TCP }),
        TcpPatternFormatter,
        { provide: PatternFormatter, useExisting: TcpPatternFormatter }
    ]
})
export class TcpModule {

    static withOptions(...options: Partial<TcpServOptions>[]): ModuleWithProviders<TcpModule> {
        const providers = options.map(r => {
            r.transport = Transport.TCP;
            r.side = TransferSide.server;
            if (!r.transportFeature) r.transportFeature = tcpTransportFactory;
            return { provide: SERVICE_CONFIGS, useValue: options, multi: true } as Provider
        });
        return {
            module: TcpModule,
            providers
        }
    }
}


