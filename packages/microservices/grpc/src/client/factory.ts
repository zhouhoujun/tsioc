import { asProvider } from '@tsdi/ioc';
import { TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { createClientTransportFeature, getClientBackendToken, ClientTransportFeature } from '@tsdi/client';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcClient } from './client';

export function grpcClientTransportFactory(option: Partial<GrpcClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as GrpcClientOptions;
    const backendToken = getClientBackendToken(config);
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: GRPC_CLIENT_OPTIONS,
        clientType: GrpcClient,
        backendProvider: asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true })
    });
}

export function withGrpcTransport(...options: Partial<GrpcClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => grpcClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
