import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { RedisServer } from './redis-server';
import { RedisPatternFormatter } from './pattern';
import { RedisServOptions, REDIS_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { resolveServiceMessageReaderFactory } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function redisTransportFactory(option: Partial<RedisServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.Redis,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || RedisPatternFormatter
            }
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
        channels: option.channels ? [...option.channels] : undefined,
    } as RedisServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.features.messageReaderFactory = resolveServiceMessageReaderFactory(option, IncomingMessageReaderFactory);
    config.features.messagerReaderFactory = config.features.messageReaderFactory;
    config.providers.push(
        { provide: REDIS_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messageReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        RedisPatternFormatter,
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const response = context.getResponse();
                const error = new NotFoundException('Not Found', 404);
                response.error = error;
                response.statusCode = error.statusCode;
                response.statusMessage = error.message;
                return of(response);
            },
            multi: true
        },
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(RedisServer).createInvocation(injector, {
                    providers: [
                        { provide: REDIS_SERV_OPTIONS, useValue: config },
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

export function useRedisTransport(...options: Partial<RedisServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => redisTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
