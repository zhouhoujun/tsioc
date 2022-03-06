import { Inject, Injectable, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { DOCUMENT, PLATFORM_ID } from '../../platform';

import { HttpHandler } from './handler';
import { HttpInterceptor } from './interceptor';
import { HttpRequest } from './request';
import { HttpEvent } from './response';

export const XSRF_COOKIE_NAME = tokenId<string>('XSRF_COOKIE_NAME');
export const XSRF_HEADER_NAME = tokenId<string>('XSRF_HEADER_NAME');

/**
 * Retrieves the current XSRF token to use with the next outgoing request.
 *
 * @publicApi
 */
export abstract class HttpXsrfTokenExtractor {
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
@Injectable()
export class HttpXsrfCookieExtractor implements HttpXsrfTokenExtractor {
    private lastCookieString: string = '';
    private lastToken: string | null = null;

    /**
     * @internal for testing
     */
    parseCount: number = 0;

    constructor(
        @Inject(DOCUMENT) private doc: any, @Inject(PLATFORM_ID) private platform: string,
        @Inject(XSRF_COOKIE_NAME) private cookieName: string) { }

    getToken(): string | null {
        if (this.platform === 'server') {
            return null;
        }
        const cookieString = this.doc.cookie || '';
        if (cookieString !== this.lastCookieString) {
            this.parseCount++;
            this.lastToken = parseCookieValue(cookieString, this.cookieName);
            this.lastCookieString = cookieString;
        }
        return this.lastToken;
    }
}

/**
 * `HttpInterceptor` which adds an XSRF token to eligible outgoing requests.
 */
@Injectable()
export class HttpXsrfInterceptor implements HttpInterceptor {
    constructor(
        private tokenService: HttpXsrfTokenExtractor,
        @Inject(XSRF_HEADER_NAME) private headerName: string) { }

    intercept(req: HttpRequest, next: HttpHandler): Observable<HttpEvent> {
        const lcUrl = req.url.toLowerCase();
        // Skip both non-mutating requests and absolute URLs.
        // Non-mutating requests don't require a token, and absolute URLs require special handling
        // anyway as the cookie set
        // on our origin is not the same as the token expected by another origin.
        if (req.method === 'GET' || req.method === 'HEAD' || lcUrl.startsWith('http://') ||
            lcUrl.startsWith('https://')) {
            return next.handle(req);
        }
        const token = this.tokenService.getToken();

        // Be careful not to overwrite an existing header of the same name.
        if (token !== null && !req.headers.has(this.headerName)) {
            req = req.clone({ headers: req.headers.set(this.headerName, token) });
        }
        return next.handle(req);
    }
}


export function parseCookieValue(cookieStr: string, name: string): string | null {
    name = encodeURIComponent(name);
    for (const cookie of cookieStr.split(';')) {
        const eqIndex = cookie.indexOf('=');
        const [cookieName, cookieValue]: string[] =
            eqIndex == -1 ? [cookie, ''] : [cookie.slice(0, eqIndex), cookie.slice(eqIndex + 1)];
        if (cookieName.trim() === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}