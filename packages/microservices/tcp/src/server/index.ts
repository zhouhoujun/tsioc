import { asProvider, Provider, getClassRef, Injector } from '@tsdi/ioc';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext } from '@tsdi/common';
import { of } from 'rxjs';
import { Transport, TransferSide } from '@tsdi/common';
import { TcpServer } from './tcp-server';
import { TcpServOptions, TCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind } from '../../../service/src/provider';
import { getServiceToken, getServiceBackendToken } from '../../../service/src/tokens';

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
                        {
                            provide: TCP_SERV_OPTIONS,
                            useValue: config
                        }
                    ]
                });
            },
            deps: [
                Injector
            ]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpServer,
            useExisting: serviceToken
        });
    }

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

export * from './options';
export * from './tcp-server';
