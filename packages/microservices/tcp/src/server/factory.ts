import { importProvidersFrom } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { TcpServer } from './tcp-server';
import { TcpServOptions, TCP_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { useTcpMessageTransfer } from './transfer';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { TcpMessageAdapter } from './message-adapter';
import { TcpMessageAdapterFactory } from './message-adapter.factory';
import { TcpMicroPatternFormatter } from '../pattern-formatter';

/**
 * create TCP transport feature for microservice.
 */
export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const formatter = option.formatter ?? TcpMicroPatternFormatter;
    const routerFormatter = typeof option.features?.router === 'object' && option.features.router.formatter
        ? option.features.router.formatter
        : formatter;
    const config = {
        transport: Transport.TCP,
        side: TransferSide.server,
        microservice: true,
        formatter,
        ...option,
        features: {
            defaultTransfer: useTcpMessageTransfer(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: routerFormatter
            }
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as TcpServOptions;

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: TCP_SERV_OPTIONS,
        serverType: TcpServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            TcpMicroPatternFormatter,
            TcpMessageAdapter,
            TcpMessageAdapterFactory
        ]
    });
}

export function useTcpTransport(...options: Partial<TcpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return tcpTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
