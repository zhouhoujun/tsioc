import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';
import { parseCookieValue } from '@tsdi/common/http';
import { HttpHandlerOutput, HttpRequestMessage, HttpServRequest, HttpServResponse, HTTP_COOKIES, HTTP_RESPONSE } from '../http-context';

export interface CookieStore {
    get(name: string): string | undefined;
    set(name: string, value?: string, opts?: CookieSerializeOptions): void;
}

export interface CookieSerializeOptions {
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None' | string;
}

type HttpCookieRequest = HttpRequestMessage & { cookies?: CookieStore };

@Injectable()
export class HttpCookieInterceptor implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {
    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const request = input as HttpCookieRequest;
        const response = context.get(HTTP_RESPONSE) as HttpServResponse;
        const header = this.getCookieHeader(request);
        const cookies: CookieStore = {
            get: (name: string) => header ? (parseCookieValue(header, name) ?? undefined) : undefined,
            set: (name: string, value = '', opts: CookieSerializeOptions = {}) => {
                const serialized = this.serializeCookie(name, value, opts);
                const current = response.getHeader('set-cookie');
                const nextValue = Array.isArray(current)
                    ? [...current, serialized]
                    : current != null
                        ? [String(current), serialized]
                        : [serialized];
                response.setHeader('set-cookie', nextValue);
            }
        };

        request.cookies = cookies;
        context.set(HTTP_COOKIES, cookies);
        return next.handle(input, context);
    }

    private getCookieHeader(request: HttpServRequest): string {
        const value = request.headers.cookie;
        if (Array.isArray(value)) {
            return value.join('; ');
        }
        return typeof value === 'string' ? value : '';
    }

    private serializeCookie(name: string, value: string, opts: CookieSerializeOptions): string {
        const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
        if (opts.maxAge != null) {
            segments.push(`Max-Age=${opts.maxAge}`);
        }
        if (opts.domain) {
            segments.push(`Domain=${opts.domain}`);
        }
        segments.push(`Path=${opts.path ?? '/'}`);
        if (opts.expires instanceof Date) {
            segments.push(`Expires=${opts.expires.toUTCString()}`);
        }
        if (opts.httpOnly) {
            segments.push('HttpOnly');
        }
        if (opts.secure) {
            segments.push('Secure');
        }
        if (opts.sameSite) {
            segments.push(`SameSite=${opts.sameSite}`);
        }
        return segments.join('; ');
    }
}
