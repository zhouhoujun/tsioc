import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';
import { parseCookieValue } from '@tsdi/common/http';
import { CookieOptions, SERVICE_COOKIE_OPTIONS } from '@tsdi/service';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
    signed?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None' | string;
}

type HttpCookieRequest = HttpRequestMessage & { cookies?: CookieStore };

@Injectable()
export class HttpCookieInterceptor implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    constructor(
        @Optional() @Inject(SERVICE_COOKIE_OPTIONS) private options?: CookieOptions
    ) { }

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const request = input as HttpCookieRequest;
        const response = context.get(HTTP_RESPONSE) as HttpServResponse;
        const header = this.getCookieHeader(request);
        const cookies: CookieStore = {
            get: (name: string) => {
                const raw = header ? parseCookieValue(header, name) : undefined;
                if (raw == null) {
                    return undefined;
                }
                return this.verify(raw);
            },
            set: (name: string, value = '', opts: CookieSerializeOptions = {}) => {
                const signed = opts.signed ?? this.options?.signed;
                const finalValue = signed ? this.sign(value) : value;
                const serialized = this.serializeCookie(name, finalValue, {
                    ...opts,
                    secure: opts.secure ?? this.options?.secure
                });
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

    private sign(value: string): string {
        return `s:${value}.${this.hmac(value)}`;
    }

    private verify(value: string): string {
        if (!value.startsWith('s:')) {
            return value;
        }
        const signed = value.slice(2);
        const separator = signed.lastIndexOf('.');
        if (separator < 0) {
            return '';
        }
        const payload = signed.slice(0, separator);
        const expected = signed.slice(separator + 1);
        const keys = this.options?.keys?.length ? this.options.keys : [''];
        for (const key of keys) {
            const candidate = this.hmac(payload, key);
            if (candidate.length === expected.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) {
                return payload;
            }
        }
        return '';
    }

    private hmac(value: string, key?: string): string {
        return createHmac('sha256', key ?? this.options?.keys?.[0] ?? '')
            .update(value)
            .digest('base64url');
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
