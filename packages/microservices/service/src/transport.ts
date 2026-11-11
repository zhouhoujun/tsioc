import { AbstractType, Injector, Provider, Token, getClassRef } from '@tsdi/ioc';
import { NotFoundException, RequestContext, StatusMessageAdapter, createRequestHandler } from '@tsdi/common';
import { of } from 'rxjs';
import { ServiceConfig, ServiceFeatureKind, ServiceTransportFeature } from './options';
import { ServiceHandler } from './ServiceHandler';
import { MicroService } from './Service';
import {
    getServiceBackendToken,
    getServiceFiltersToken,
    getServiceGuardsToken,
    getServiceInterceptorsToken,
    getServiceToken
} from './tokens';
import { REGISTER_MICRO_SERVICES } from './SetupMicroServices';
import { AuthInterceptor } from './interceptors/auth';
import { MessageAuthInterceptor } from './interceptors/message-auth';

export interface CreateServiceTransportFeatureOptions<TConfig extends ServiceConfig = ServiceConfig> {
    /**
     * normalized transport config.
     */
    config: TConfig;
    /**
     * transport option token (e.g. `WS_SERV_OPTIONS`).
     */
    optionToken: Token<TConfig>;
    /**
     * microservice server type (e.g. `WsServer`).
     */
    serverType: AbstractType<MicroService>;
    /**
     * mark this transport as the default one.
     */
    asDefault?: boolean;
    /**
     * protocol-specific providers (message adapter, pattern formatter, ...).
     */
    providers?: Provider[];
    /**
     * default not-found backend. Falls back to a 404 payload written through
     * the status adapter.
     */
    backendProvider?: Provider;
    /**
     * disable the shared message auth bridge. Default true.
     */
    includeAuth?: boolean;
}

function defaultBackendProvider(backendToken: Token<any>): Provider {
    return {
        provide: backendToken,
        useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            const error = new NotFoundException('Not Found', 404);
            if (adapter) {
                adapter.setStatus(error.statusCode, error.message)
                    .setError(error)
                    .setPayload({ statusCode: error.statusCode, statusMessage: error.message });
                return of(adapter);
            }
            return of(null);
        },
        multi: true
    };
}

/**
 * Build the common server side transport feature used by every microservice
 * protocol: option token, auth bridge, default not-found backend, handler and
 * registration lifecycle.
 *
 * Protocol packages only provide their config, server type and protocol-specific
 * providers. This keeps auth/registration/behavior consistent when adding a new
 * transport.
 */
export function createServiceTransportFeature<TConfig extends ServiceConfig>(
    options: CreateServiceTransportFeatureOptions<TConfig>
): ServiceTransportFeature {
    const { config, optionToken, serverType } = options;
    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push({ provide: optionToken, useValue: config });

    const authProviders: Provider[] = config.features.auth && options.includeAuth !== false
        ? [{
            provide: getServiceInterceptorsToken(config),
            useExisting: MessageAuthInterceptor,
            multi: true,
            multiOrder: -300
        } as Provider & { multiOrder: number }]
        : [];

    const providers: Provider[] = [
        ...(options.providers ?? []),
        { provide: AuthInterceptor, useClass: MessageAuthInterceptor },
        { provide: MessageAuthInterceptor, useExisting: AuthInterceptor },
        ...authProviders,
        options.backendProvider ?? defaultBackendProvider(backendToken),
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => getClassRef(serverType).createInvocation(injector, {
                providers: [
                    { provide: optionToken, useValue: config },
                    {
                        provide: ServiceHandler,
                        useFactory: (inj: Injector) => createRequestHandler(inj, config),
                        deps: [Injector]
                    }
                ]
            }),
            deps: [Injector]
        },
        {
            provide: REGISTER_MICRO_SERVICES,
            useFactory: (service) => ({
                service,
                bootstrap: config.bootstrap,
                microservice: config.microservice,
                asDefault: options.asDefault
            }),
            deps: [serviceToken],
            multi: true
        }
    ];

    return {
        kind: ServiceFeatureKind.Transport,
        config,
        providers
    };
}
