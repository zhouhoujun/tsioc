import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { GrpcServer } from './grpc-server';
import { GrpcServOptions, GRPC_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
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
    config.providers.push(
        { provide: GRPC_SERV_OPTIONS, useValue: config },
    );
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: AuthInterceptor, useClass: MessageAuthInterceptor },
        { provide: MessageAuthInterceptor, useExisting: AuthInterceptor },
        ...authProviders,
        { provide: backendToken, useValue: (_req: any, _context: RequestContext): any => {
            const error = new NotFoundException('Not Found', 404);
            return of({ statusCode: error.statusCode, statusMessage: error.message, error });
        }, multi: true },
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(GrpcServer).createInvocation(inj, {
            providers: [{ provide: GRPC_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useGrpcTransport(...options: Partial<GrpcServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => grpcTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
