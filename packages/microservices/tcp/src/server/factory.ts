import { asProvider, Provider, getClassRef, Injector, isArray, importProvidersFrom } from '@tsdi/ioc';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler, TransferInterceptorFactory, Transport, TransferSide, MessageReaderFactory, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { TcpServer } from './tcp-server';
import { TcpServOptions, TCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, ServiceHandler, REGISTER_MICRO_SERVICES, getServiceTransfersToken } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

/**
 * create TCP transport feature for microservice.
 */
export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.TCP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features,
            defaultTransfer: useJsonPacket(),
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as TcpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);

    config.providers = [
        { provide: TCP_SERV_OPTIONS, useValue: config },
        ...(config.providers ?? [])
    ];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: MessageReaderFactory, useClass: IncomingMessageReaderFactory },
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        asProvider({
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const response = context.getResponse();
                const statusAdapter = context.get(StatusAdapter);
                response.error = new NotFoundException();
                if (statusAdapter) {
                    response.statusCode = statusAdapter.notFound;
                    response.statusMessage = response.error.message;
                }
                return of(response);
            },
            multi: true
        }),

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(TcpServer).createInvocation(injector, {
                    providers: [
                        { provide: TCP_SERV_OPTIONS, useValue: config },
                        {
                            provide: ServiceHandler,
                            useFactory: (inj: Injector) => createRequestHandler(inj, config),
                            deps: [Injector]
                        }
                    ]
                });
            },
            deps: [Injector]
        },
        {
            provide: REGISTER_MICRO_SERVICES,
            useFactory: (service) => {
                return {
                    service,
                    bootstrap: config.bootstrap,
                    microservice: config.microservice,
                    asDefault
                }
            },
            deps: [
                serviceToken
            ],
            multi: true
        }
    ];

    return {
        kind: ServiceFeatureKind.Transport,
        config,
        providers
    };
}

export function withTcpTransport(...options: Partial<TcpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return tcpTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
