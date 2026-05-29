import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { REDIS_CLIENT_OPTIONS, RedisClientOptions } from './options';
import { RedisClient } from './client';
import { RedisPatternFormatter } from '../server';


function redisClientTransportFactory(option: Partial<RedisClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.Redis,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as RedisClientOptions;
    config.formatter ??= RedisPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: REDIS_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: createSendMessageBackend,
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => {
                return createRequestHandler(injector, config)
            },
            deps: [
                Injector
            ]
        },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: REDIS_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        RedisClient
                    ]
                });
                return childInjector.get(RedisClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: RedisClient,
            useExisting: clientToken
        });
        if (config.formatter) {
            providers.push({
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            });
        }
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withRedisTransport(...options: Partial<RedisClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return redisClientTransportFactory(option, asDefault);
    });
}
