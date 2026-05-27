import expect = require('expect');
import { Transport, TransferSide } from '@tsdi/common';
import {
    BodyParserInterceptor,
    ContentInterceptor,
    CookieInterceptor,
    JsonInterceptor,
    SessionInterceptor,
    SERVICE_BODY_PARSER_OPTIONS,
    SERVICE_CONTENT_OPTIONS,
    SERVICE_COOKIE_OPTIONS,
    SERVICE_JSON_OPTIONS,
    SERVICE_SESSION_OPTIONS,
    getServiceInterceptorsToken,
    withBodyParser,
    withContent,
    withCookie,
    withJson,
    withSession,
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
    });

    it('registers default interceptors and option tokens', () => {
        const config = createConfig();
        const interceptorToken = getServiceInterceptorsToken(config);
        const content = withContent()(config) as any;
        const json = withJson()(config) as any;
        const body = withBodyParser()(config) as any;
        const session = withSession()(config) as any;
        const cookie = withCookie()(config) as any;

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
    });

    it('uses custom interceptor override and strips framework meta fields from options', () => {
        class CustomJsonInterceptor {
            intercept(input: any, next: any, context: any) {
                return next.handle(input, context);
            }
        }
        const config = createConfig();
        const interceptorToken = getServiceInterceptorsToken(config);
        const feature = withJson({ strict: true, interceptor: CustomJsonInterceptor, multiOrder: 1200 })(config) as any;
        const optionProvider = feature.providers.find((provider: any) => provider.provide === SERVICE_JSON_OPTIONS);
        const interceptorProvider = feature.providers.find((provider: any) => provider.provide === interceptorToken);

        expect(optionProvider.useValue).toEqual({ strict: true });
        expect(interceptorProvider.useClass).toBe(CustomJsonInterceptor);
        expect(interceptorProvider.multi).toBe(true);
        expect(interceptorProvider.multiOrder).toBe(1200);
    });
});
