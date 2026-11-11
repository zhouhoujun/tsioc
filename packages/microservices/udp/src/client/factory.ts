import { Injector, asProvider } from '@tsdi/ioc';
import { Events, PatternFormatter, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { createClientTransportFeature, getClientBackendToken, wrapClientBackendWithTransfer, ClientTransportFeature } from '@tsdi/client';
import { UDP_CLIENT_OPTIONS, UdpClientOptions } from './options';
import { UdpClient } from './client';
import { UdpMicroPatternFormatter } from '../pattern-formatter';

export function udpClientTransportFactory(option: Partial<UdpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.UDP, side: TransferSide.client,
        formatter: option.microservice === false ? (option as any).formatter : ((option as any).formatter ?? UdpMicroPatternFormatter),
        ...option,
        features: { defaultTransfer: useJsonPacket({ eventName: Events.MESSAGE }), ...option.features },
    } as UdpClientOptions;
    const backendToken = getClientBackendToken(config);
    const providers = config.formatter === UdpMicroPatternFormatter ? [UdpMicroPatternFormatter] : [];
    const defaultProviders = config.formatter
        ? [config.formatter === UdpMicroPatternFormatter
            ? { provide: PatternFormatter, useExisting: UdpMicroPatternFormatter }
            : {
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            }]
        : [];
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: UDP_CLIENT_OPTIONS,
        clientType: UdpClient,
        providers,
        backendProvider: asProvider({
            provide: backendToken,
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createSendMessageBackend(Events.MESSAGE)),
            deps: [Injector],
            multi: true
        }),
        defaultProviders
    });
}

export function withUdpTransport(...options: Partial<UdpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => udpClientTransportFactory(option, option.asDefault ?? (idx === 0)));
}
