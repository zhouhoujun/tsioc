import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { HttpAuthService } from '@tsdi/security';
import { of } from 'rxjs';
import { HttpServer } from './http-server';
import { HttpServOptions, HTTP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES, SERVICE_BODY_PARSER_OPTIONS } from '@tsdi/service';
import { MimeModule } from '@tsdi/mime';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { HttpBodyParserInterceptor } from './interceptors/bodyparser';
import { HttpContentInterceptor, STATICS_OPTIONS } from './interceptors/content';
import { HttpJsonInterceptor } from './interceptors/json';
import { HttpSessionInterceptor } from './interceptors/session';
import { HttpCookieInterceptor } from './interceptors/cookie';
import { HttpAuthInterceptor, HTTP_AUTH_OPTIONS } from './interceptors/auth';
import { Cors } from './interceptors/cors';
import { HttpMessageAdapter } from './message-adapter';
import { HttpMessageAdapterFactory } from './message-adapter.factory';
import { AuthInterceptor, BodyParserInterceptor, ContentInterceptor, CookieInterceptor, CorsInterceptor, JsonInterceptor, SERVICE_STATICS_OPTIONS, SessionInterceptor } from '@tsdi/service';

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
    config.providers.push(
        { provide: HTTP_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        ...config.providers,
        importProvidersFrom(MimeModule),
        importProvidersFrom(ServerCommonModule),
        HttpMessageAdapter,
        HttpMessageAdapterFactory,
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
        { provide: HttpAuthService, useClass: HttpAuthService },
        { provide: AuthInterceptor, useClass: HttpAuthInterceptor },
        { provide: HttpAuthInterceptor, useExisting: AuthInterceptor },
        { provide: CorsInterceptor, useClass: Cors },
        ...(config.features.bodyparser ? [{
            provide: config.features.interceptorsToken,
            useExisting: BodyParserInterceptor,
            multi: true,
            multiOrder: -1000
        } as any] : []),
        ...(config.features.auth ? [{
            provide: HTTP_AUTH_OPTIONS,
            useValue: config.features.auth,
        }, {
            provide: config.features.interceptorsToken,
            useExisting: HttpAuthInterceptor,
            multi: true,
            multiOrder: -300
        } as any] : []),
        ...(config.static ? [{
            provide: STATICS_OPTIONS,
            useValue: config.static === true ? {} : config.static,
        }, {
            provide: SERVICE_STATICS_OPTIONS,
            useValue: config.static === true ? {} : config.static,
        }, {
            provide: config.features.interceptorsToken,
            useExisting: ContentInterceptor,
            multi: true,
            multiOrder: -50
        } as any] : []),
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            const error = new NotFoundException('Not Found', 404);
            if (adapter) {
                adapter.writeError(error);
                adapter.setStatus(error.statusCode, error.message);
                adapter.write({ statusCode: error.statusCode, statusMessage: error.message });
                return of(adapter);
            }
            return of(null);
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
