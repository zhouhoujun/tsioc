import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory, DefaultHeaderAdapter, HeaderAdapter } from '@tsdi/common';
import { of } from 'rxjs';
import { HttpServer } from './http-server';
import { HttpServOptions, HTTP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { MimeModule } from '@tsdi/mime';
import { HttpBodyParserInterceptor } from './interceptors/bodyparser';
import { HttpContentInterceptor } from './interceptors/content';
import { HttpJsonInterceptor } from './interceptors/json';
import { ContentInterceptor, JsonInterceptor, BodyParserInterceptor } from '@tsdi/service';

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

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: HTTP_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(MimeModule),
        { provide: HeaderAdapter, useClass: DefaultHeaderAdapter },
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        { provide: ContentInterceptor, useClass: HttpContentInterceptor },
        { provide: JsonInterceptor, useClass: HttpJsonInterceptor },
        { provide: BodyParserInterceptor, useClass: HttpBodyParserInterceptor },
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const r = context.getResponse(); const s = context.get(StatusAdapter);
            r.error = new NotFoundException(); if (s) { r.statusCode = s.notFound; r.statusMessage = r.error.message; } return of(r);
        }, multi: true },
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(HttpServer).createInvocation(inj, {
            providers: [{ provide: HTTP_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function withHttpTransport(...options: Partial<HttpServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => httpTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
