import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { resolveClientMessageReaderFactory } from '@tsdi/client';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';

function grpcClientTransportFactory(option: Partial<GrpcClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as GrpcClientOptions;
    config.providers ??= [];
    config.features.messageReaderFactory = resolveClientMessageReaderFactory(option, IncomingMessageReaderFactory);
    config.features.messagerReaderFactory = config.features.messageReaderFactory;
    config.providers.push(
        { provide: GRPC_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messageReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        { provide: clientToken, useFactory: (h: ClientHandler<any, any>) => new GrpcClient(h, config), deps: [hanlderToken] }
    ];
    if (asDefault) providers.push({ provide: GrpcClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withGrpcTransport(...options: Partial<GrpcClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => grpcClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
