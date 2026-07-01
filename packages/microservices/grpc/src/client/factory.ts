import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientInterceptorsToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { ensureClientConnectedInterceptor } from '@tsdi/client/src/interceptors/connect';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcClient } from './client';

function grpcClientTransportFactory(option: Partial<GrpcClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as GrpcClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: GRPC_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const interceptorsToken = getClientInterceptorsToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: GRPC_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        GrpcClient
                    ]
                });
                return childInjector.get(GrpcClient);
            },
            deps: [Injector]
        },
        { provide: interceptorsToken, useValue: ensureClientConnectedInterceptor(config), multi: true, multiOrder: 0 }
    ];
    if (asDefault) providers.push({ provide: GrpcClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withGrpcTransport(...options: Partial<GrpcClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => grpcClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
