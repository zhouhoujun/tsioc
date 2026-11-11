import { importProvidersFrom } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { WsServer } from './ws-server';
import { WsServOptions, WS_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { useWsPacket } from '../transfer';
import { WsMessageAdapter } from './message-adapter';
import { WsMessageAdapterFactory } from './message-adapter.factory';

export function wsTransportFactory(option: Partial<WsServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.WS,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useWsPacket(),
            ...option.features
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as WsServOptions;

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: WS_SERV_OPTIONS,
        serverType: WsServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            WsMessageAdapter,
            WsMessageAdapterFactory
        ]
    });
}

export function useWsTransport(...options: Partial<WsServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return wsTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
