import { RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HttpHandler } from './handler';
import { HttpInterceptor } from './interceptor';
import { HttpRequest } from './request';
import { HttpEvent } from './response';
export declare const XSRF_COOKIE_NAME: import("@tsdi/ioc").InjectToken<string>;
export declare const XSRF_HEADER_NAME: import("@tsdi/ioc").InjectToken<string>;
/**
 * Retrieves the current XSRF token to use with the next outgoing request.
 *
 * @publicApi
 */
export declare abstract class HttpXsrfTokenExtractor {
    /**
     * Get the XSRF token to use with an outgoing request.
     *
     * Will be called for every request, so the token may change between requests.
     */
    abstract getToken(): string | null;
}
/**
 * `HttpXsrfTokenExtractor` which retrieves the token from a cookie.
 */
export declare class HttpXsrfCookieExtractor implements HttpXsrfTokenExtractor {
    private doc;
    private platform;
    private cookieName;
    private lastCookieString;
    private lastToken;
    /**
     * @internal for testing
     */
    parseCount: number;
    constructor(doc: any, platform: string, cookieName: string);
    getToken(): string | null;
}
/**
 * `HttpInterceptor` which adds an XSRF token to eligible outgoing requests.
 */
export declare class HttpXsrfInterceptor implements HttpInterceptor {
    private tokenService;
    private headerName;
    constructor(tokenService: HttpXsrfTokenExtractor, headerName: string);
    intercept(req: HttpRequest<any>, next: HttpHandler, context: RequestContext): Observable<HttpEvent<any>>;
}
export declare function parseCookieValue(cookieStr: string, name: string): string | null;
