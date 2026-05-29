import expect = require('expect');
import { Observable } from 'rxjs';
import { RequestContext, RequestHandler, RequestInterceptor, Transport, TransferSide } from '@tsdi/common';
import {
    BodyParserInterceptor,
    ContentInterceptor,
    CookieInterceptor,
    CorsInterceptor,
    JsonInterceptor,
    ServiceFeatureKind,
    SessionInterceptor,
    SERVICE_BODY_PARSER_OPTIONS,
    SERVICE_CONTENT_OPTIONS,
    SERVICE_COOKIE_OPTIONS,
    SERVICE_CORS_OPTIONS,
    SERVICE_JSON_OPTIONS,
    SERVICE_SESSION_OPTIONS,
    getServiceInterceptorsToken,
    useBodyParser,
    useContent,
    useCookie,
    useCors,
    useJson,
    useFeatures,
    useSession,
} from '../src';

const createConfig = () => ({
    transport: Transport.HTTP,
    side: TransferSide.server,
    microservice: true,
    features: {}
} as any);

describe('service provider', () => {
    it('exports abstract feature interceptors', () => {
        expect(ContentInterceptor).toBeDefined();
        expect(JsonInterceptor).toBeDefined();
        expect(BodyParserInterceptor).toBeDefined();
        expect(SessionInterceptor).toBeDefined();
        expect(CookieInterceptor).toBeDefined();
        expect(CorsInterceptor).toBeDefined();
    });

    it('supports typed abstract interceptor specializations', () => {
        interface TypedReq {
            id: string;
        }
        interface TypedRes {
            ok: true;
        }
        class TypedContext extends RequestContext { }
        class TypedContentInterceptor extends ContentInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }
        class TypedJsonInterceptor extends JsonInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }
        class TypedBodyParserInterceptor extends BodyParserInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }
        class TypedSessionInterceptor extends SessionInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }
        class TypedCookieInterceptor extends CookieInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }
        class TypedCorsInterceptor extends CorsInterceptor<TypedReq, TypedRes, TypedContext> {
            intercept(input: TypedReq, next: RequestHandler<TypedReq, TypedRes, TypedContext>, context: TypedContext): Observable<TypedRes> {
                return next.handle(input, context);
            }
        }

        const interceptors: RequestInterceptor<TypedReq, TypedRes, TypedContext>[] = [
            new TypedContentInterceptor(),
            new TypedJsonInterceptor(),
            new TypedBodyParserInterceptor(),
            new TypedSessionInterceptor(),
            new TypedCookieInterceptor(),
            new TypedCorsInterceptor()
        ];

        expect(interceptors).toHaveLength(6);
        expect(interceptors.every(interceptor => typeof interceptor.intercept === 'function')).toBe(true);
    });

    it('registers default interceptors and option tokens', () => {
        const config = createConfig();
        const interceptorToken = getServiceInterceptorsToken(config);
        const content = useContent()(config) as any;
        const json = useJson()(config) as any;
        const body = useBodyParser()(config) as any;
        const session = useSession()(config) as any;
        const cookie = useCookie()(config) as any;
        const cors = useCors()(config) as any;

        expect(content.providers.some((provider: any) => provider.provide === SERVICE_CONTENT_OPTIONS)).toBe(true);
        expect(content.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === ContentInterceptor)).toBe(true);
        expect(json.providers.some((provider: any) => provider.provide === SERVICE_JSON_OPTIONS)).toBe(true);
        expect(json.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === JsonInterceptor)).toBe(true);
        expect(body.providers.some((provider: any) => provider.provide === SERVICE_BODY_PARSER_OPTIONS)).toBe(true);
        expect(body.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === BodyParserInterceptor)).toBe(true);
        expect(session.providers.some((provider: any) => provider.provide === SERVICE_SESSION_OPTIONS)).toBe(true);
        expect(session.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === SessionInterceptor)).toBe(true);
        expect(cookie.providers.some((provider: any) => provider.provide === SERVICE_COOKIE_OPTIONS)).toBe(true);
        expect(cookie.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === CookieInterceptor)).toBe(true);
        expect(cors.kind).toBe(ServiceFeatureKind.Cors);
        expect(cors.providers.some((provider: any) => provider.provide === SERVICE_CORS_OPTIONS)).toBe(true);
        expect(cors.providers.some((provider: any) => provider.provide === interceptorToken && provider.useExisting === CorsInterceptor && provider.multiOrder === -900)).toBe(true);
    });

    it('uses custom interceptor override and strips framework meta fields from options', () => {
        class CustomJsonInterceptor {
            intercept(input: any, next: any, context: any) {
                return next.handle(input, context);
            }
        }
        const config = createConfig();
        const interceptorToken = getServiceInterceptorsToken(config);
        const feature = useJson({ strict: true, interceptor: CustomJsonInterceptor, multiOrder: 1200 })(config) as any;
        const optionProvider = feature.providers.find((provider: any) => provider.provide === SERVICE_JSON_OPTIONS);
        const interceptorProvider = feature.providers.find((provider: any) => provider.provide === interceptorToken);

        expect(optionProvider.useValue).toEqual({ strict: true });
        expect(interceptorProvider.useClass).toBe(CustomJsonInterceptor);
        expect(interceptorProvider.multi).toBe(true);
        expect(interceptorProvider.multiOrder).toBe(1200);
    });

    it('supports custom cors interceptor overrides and combined feature builder integration', () => {
        class CustomCorsInterceptor {
            intercept(input: any, next: any, context: any) {
                return next.handle(input, context);
            }
        }
        const config = createConfig();
        const interceptorToken = getServiceInterceptorsToken(config);
        const feature = useCors({ origin: '*', credentials: true, interceptor: CustomCorsInterceptor, multiOrder: 123 })(config) as any;
        const optionProvider = feature.providers.find((provider: any) => provider.provide === SERVICE_CORS_OPTIONS);
        const interceptorProvider = feature.providers.find((provider: any) => provider.provide === interceptorToken);
        const combined = useFeatures({ cors: { origin: 'https://example.com' } } as any)(config) as any[];

        expect(optionProvider.useValue).toEqual({ origin: '*', credentials: true });
        expect(interceptorProvider.useClass).toBe(CustomCorsInterceptor);
        expect(interceptorProvider.multi).toBe(true);
        expect(interceptorProvider.multiOrder).toBe(123);
        expect(combined.some(feature => feature.kind === ServiceFeatureKind.Cors)).toBe(true);
        expect(combined.flatMap(feature => feature.providers).some((provider: any) => provider.provide === SERVICE_CORS_OPTIONS && provider.useValue.origin === 'https://example.com')).toBe(true);
    });
});
