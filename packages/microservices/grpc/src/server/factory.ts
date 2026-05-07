import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { GrpcServer } from './grpc-server';
import { GrpcServOptions, GRPC_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function grpcTransportFactory(option: Partial<GrpcServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.server, microservice: true,
        ...option,
        features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as GrpcServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config); getServiceFiltersToken(config); getServiceGuardsToken(config);

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: GRPC_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const r = context.getResponse(); const s = context.get(StatusAdapter);
            r.error = new NotFoundException(); if (s) { r.statusCode = s.notFound; r.statusMessage = r.error.message; } return of(r);
        }, multi: true },
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(GrpcServer).createInvocation(inj, {
            providers: [{ provide: GRPC_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function withGrpcTransport(...options: Partial<GrpcServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => grpcTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
