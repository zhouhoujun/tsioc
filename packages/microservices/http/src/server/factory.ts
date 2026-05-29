import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common';
import { of } from 'rxjs';
import { HttpServer } from './http-server';
import { HttpServOptions, HTTP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES, SERVICE_BODY_PARSER_OPTIONS } from '@tsdi/service';
import { MimeModule } from '@tsdi/mime';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { HttpBodyParserInterceptor } from './interceptors/bodyparser';
import { HttpContentInterceptor } from './interceptors/content';
import { HttpJsonInterceptor } from './interceptors/json';
import { HttpSessionInterceptor } from './interceptors/session';
import { HttpCookieInterceptor } from './interceptors/cookie';
import { Cors } from './interceptors/cors';
import { StaticFileInterceptor } from './static-file.interceptor';
import { HttpMessageReaderFactory } from './message-reader';
import { BodyParserInterceptor, ContentInterceptor, CookieInterceptor, CorsInterceptor, JsonInterceptor, SessionInterceptor } from '@tsdi/service';

export function httpTransportFactory(option: Partial<HttpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.HTTP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            bodyparser: true,
            ...option.features,
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as HttpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    config.features.interceptorsToken ??= getServiceInterceptorsToken(config);
    config.features.filtersToken ??= getServiceFiltersToken(config);
    config.features.guardsToken ??= getServiceGuardsToken(config);

    config.providers = option.providers ? [...option.providers] : [];
    config.features.messagerReaderFactory ??= HttpMessageReaderFactory;
    config.providers.push(
        { provide: HTTP_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(MimeModule),
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        { provide: ContentInterceptor, useClass: HttpContentInterceptor },
        { provide: JsonInterceptor, useClass: HttpJsonInterceptor },
        {
            provide: BodyParserInterceptor,
            useFactory: (inj: Injector) => new HttpBodyParserInterceptor(
                inj.get(SERVICE_BODY_PARSER_OPTIONS, null),
                config,
            ),
            deps: [Injector]
        },
        { provide: SessionInterceptor, useClass: HttpSessionInterceptor },
        { provide: CookieInterceptor, useClass: HttpCookieInterceptor },
        { provide: CorsInterceptor, useClass: Cors },
        ...(config.features.bodyparser ? [{
            provide: config.features.interceptorsToken,
            useExisting: BodyParserInterceptor,
            multi: true,
            multiOrder: -1000
        } as any] : []),
        ...(config.static ? [{
            provide: config.features.interceptorsToken,
            useFactory: () => new StaticFileInterceptor(config.static),
            multi: true,
            multiOrder: -50
        } as any] : []),
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const r = context.getResponse();
            const error = new NotFoundException('Not Found', 404);
            r.error = error;
            r.statusCode = error.statusCode;
            r.statusMessage = error.message;
            return of(r);
        }, multi: true },
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(HttpServer).createInvocation(inj, {
            providers: [{ provide: HTTP_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useHttpTransport(...options: Partial<HttpServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => httpTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
