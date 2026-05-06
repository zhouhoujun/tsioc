import { asProvider, Provider, getClassRef, Injector, Invocation } from '@tsdi/ioc';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler } from '@tsdi/common';
import { of } from 'rxjs';
import { Transport, TransferSide } from '@tsdi/common';
import { TcpServer } from './tcp-server';
import { TcpServOptions, TCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';

/**
 * create TCP transport feature for microservice.
 */
export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        ...option,
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
        // Preserve token references set by feature functions
        transfersToken: option.transfersToken,
        interceptorsToken: option.interceptorsToken,
        guardsToken: option.guardsToken,
        filtersToken: option.filtersToken,
        routerToken: option.routerToken,
        backendToken: option.backendToken
    } as TcpServOptions;
    config.transport = Transport.TCP;
    config.side = TransferSide.server;
    config.microservice = true;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    config.providers = [...(config.providers ?? [])];
    config.providers.push({ provide: TCP_SERV_OPTIONS, useValue: config });

    const providers: Provider[] = [
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
