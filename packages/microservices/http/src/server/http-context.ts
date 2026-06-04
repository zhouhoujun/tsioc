import { ContextToken, isString } from '@tsdi/ioc';
import { Outgoing, RequestContext, WritableLike, REQUEST } from '@tsdi/common';
import * as http from 'node:http';
import * as http2 from 'node:http2';
import { TLSSocket } from 'node:tls';
import { HttpUploadFile } from './multipart';

export type HttpServRequest = http.IncomingMessage | http2.Http2ServerRequest;
export type HttpServResponse = http.ServerResponse | http2.Http2ServerResponse;

export interface HttpCookieStore {
    get(name: string): string | undefined;
    set(name: string, value?: string, opts?: Record<string, unknown>): void;
}

export type HttpRequestMessage<TBody = any> = HttpServRequest & {
    body?: TBody | null;
    rawBody?: string | Buffer;
    rawUrl?: string;
    rawRequest?: HttpServRequest;
    query: Record<string, string>;
    params?: Record<string, unknown>;
    paths?: Record<string, string>;
    fields?: Record<string, string>;
    files?: Record<string, HttpUploadFile>;
    cookies?: HttpCookieStore;
    _session?: unknown;
    _auth?: HttpRequestAuth;
    getHeader(name: string): string | undefined;
    hasHeader(name: string): boolean;
    getHeaderNames(): string[];
};

export type HttpHandlerOutput = WritableLike<Outgoing> | string | Buffer | object | null | undefined;

export interface HttpRequestAuth {
    authenticated: boolean;
    token: string | null;
    claims?: any;
}

export const HTTP_RESPONSE = new ContextToken<HttpServResponse | null>(() => null);
export const HTTP_COOKIES = new ContextToken<HttpCookieStore | null>(() => null);
export const HTTP_SESSION = new ContextToken<any | null>(() => null);
export const HTTP_AUTH_RESULT = new ContextToken<HttpRequestAuth | null>(() => null);
export const HTTP_PROXY_ENABLED = new ContextToken<boolean>(() => false);
export const HTTP_PROXY_IP_HEADER = new ContextToken<string>(() => X_FORWARDED_FOR);
export const HTTP_MAX_IPS_COUNT = new ContextToken<number>(() => 0);

export const CONTENT_TYPE = 'content-type';
export const IF_MODIFIED_SINCE = 'if-modified-since';
export const IF_NONE_MATCH = 'if-none-match';
export const LAST_MODIFIED = 'last-modified';
export const CACHE_CONTROL = 'cache-control';
export const VARY = 'vary';
const X_FORWARDED_FOR = 'x-forwarded-for';
const X_FORWARDED_PROTO = 'x-forwarded-proto';
const no_cache = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;

/**
 * Enhanced HTTP context utility that wraps a RequestContext and provides
 * HTTP-specific convenience methods for IP, proxy, cache validation, etc.
 */
export class HttpContextUtil {

    static from(context: RequestContext): {
        ip: string;
        ips: string[];
        protocol: string;
        secure: boolean;
        fresh: boolean;
        stale: boolean;
        writable: boolean;
        vary(field: string): void;
        flushHeaders(): void;
    } {
        const req = context.get(REQUEST) as HttpServRequest;
        const res = context.get(HTTP_RESPONSE) as HttpServResponse;

        const proxy = context.get(HTTP_PROXY_ENABLED);
        const proxyIpHeader = context.get(HTTP_PROXY_IP_HEADER);
        const maxIpsCount = context.get(HTTP_MAX_IPS_COUNT);

        const getIps = (): string[] => {
            const val = (proxy && req.headers[proxyIpHeader]) as string;
            let ips = (val ? val.split(/\s*,\s*/) : []) as string[];
            if (maxIpsCount > 0) {
                ips = ips.slice(-maxIpsCount);
            }
            return ips;
        };

        const getIp = (): string => {
            const ips = getIps();
            return ips[0] || req.socket?.remoteAddress || '';
        };

        const getProtocol = (): string => {
            if ((req.socket as TLSSocket)?.encrypted) return 'https';
            if (!proxy) return 'http';
            const proto = req.headers[X_FORWARDED_PROTO] as string;
            return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http';
        };

        const getFresh = (): boolean => {
            const method = req.method?.toUpperCase();
            if (method !== 'GET' && method !== 'HEAD') return false;
            const status = res.statusCode;
            if ((status >= 200 && status < 300) || status === 304) {
                return isFresh(req, res);
            }
            return false;
        };

        const vary = (field: string) => {
            if (res.headersSent) return;
            let val = res.getHeader(VARY) as string ?? '';
            const header = Array.isArray(val) ? val.join(', ') : String(val);
            const result = appendVar(header, field);
            if (result) {
                res.setHeader(VARY, result);
            }
        };

        const flushHeaders = () => {
            if (res instanceof http.ServerResponse) {
                res.flushHeaders();
            }
        };

        return {
            get ip() { return getIp(); },
            get ips() { return getIps(); },
            get protocol() { return getProtocol(); },
            get secure() { return getProtocol() === 'https'; },
            get fresh() { return getFresh(); },
            get stale() { return !getFresh(); },
            get writable() {
                if ((res as any).writableEnded || (res as any).finished) return false;
                const socket = (res as any).socket;
                if (!socket) return true;
                return socket.writable;
            },
            vary,
            flushHeaders,
        };
    }
}

function isFresh(req: HttpServRequest, res: HttpServResponse): boolean {
    const reqHeaders = req.headers;
    const modifiedSince = reqHeaders[IF_MODIFIED_SINCE] as string;
    const noneMatch = reqHeaders[IF_NONE_MATCH] as string;
    if (!modifiedSince && !noneMatch) return false;

    const cacheControl = reqHeaders[CACHE_CONTROL] as string;
    if (cacheControl && no_cache.test(cacheControl)) return false;

    if (noneMatch && noneMatch !== '*') {
        const etag = res.getHeader('etag') as string;
        if (!etag) return false;
        const matches = parseTokenList(noneMatch);
        let etagStale = true;
        for (const match of matches) {
            if (match === etag || match === 'W/' + etag || 'W/' + match === etag) {
                etagStale = false;
                break;
            }
        }
        if (etagStale) return false;
    }

    if (modifiedSince) {
        const lastModified = res.getHeader(LAST_MODIFIED) as string;
        const modifiedStale = !lastModified || !(parseStamp(lastModified) <= parseStamp(modifiedSince));
        if (modifiedStale) return false;
    }
    return true;
}

function parseTokenList(val: string): string[] {
    return val.split(/\s*,\s*/).map(s => s.trim()).filter(s => s.length > 0);
}

function parseStamp(date?: string | number): number {
    if (date) {
        return isString(date) ? Date.parse(date) : date;
    }
    return NaN;
}

function appendVar(header: string, field: string): string | false {
    if (!header) return field;
    if (!field) return false;
    const fields = header.split(/\s*,\s*/);
    if (fields.includes(field)) return false;
    return header + ', ' + field;
}
