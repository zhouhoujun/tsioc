import { Abstract, Injectable, isArray, isFunction, isPromise, Nullable, Inject } from '@tsdi/ioc';
import { InternalServerException, HttpStatusCode, RequestInterceptor, RequestHandler, RequestContext } from '@tsdi/common';
import { defer, lastValueFrom, Observable } from 'rxjs';
import * as http from 'node:http';
import { SERVICE_CORS_OPTIONS } from '@tsdi/service';
import { HttpHandlerOutput, HttpRequestMessage, HttpServResponse, HTTP_RESPONSE } from '../http-context';

/**
 * cors options.
 */
@Abstract()
export abstract class CorsOptions {
    origin?: string | ((req: http.IncomingMessage) => string | Promise<string>);
    credentials?: boolean;
    exposeHeaders?: string;
    keepHeadersOnError?: boolean;
    allowMethods?: string | (string | number)[];
    allowHeaders?: string | string[];
    maxAge?: number | string;
}

const ORIGIN = 'Origin';

@Injectable()
export class Cors implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    private options: Options;

    constructor(
        @Nullable() options: CorsOptions,
        @Inject(SERVICE_CORS_OPTIONS, { nullable: true }) sharedOptions?: CorsOptions
    ) {
        this.options = this.parseOption({
            allowMethods,
            ...(sharedOptions ?? {}),
            ...(options ?? {})
        });
    }

    protected parseOption(options: CorsOptions): Options {
        if (isArray(options.exposeHeaders)) {
            options.exposeHeaders = options.exposeHeaders.join(',');
        }
        if (isArray(options.allowMethods)) {
            options.allowMethods = options.allowMethods.join(',');
        }
        if (isArray(options.allowHeaders)) {
            options.allowHeaders = options.allowHeaders.join(',');
        }
        if (options.maxAge) {
            options.maxAge = String(options.maxAge);
        }
        options.keepHeadersOnError = options.keepHeadersOnError === undefined || !!options.keepHeadersOnError;
        return options as Options;
    }

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const res = context.get(HTTP_RESPONSE) as HttpServResponse;
        const req = input;
        const requestOrigin = (req.headers[ORIGIN] || req.headers[ORIGIN.toLowerCase()]) as string;
        if (!res.headersSent) {
            vary(res, ORIGIN);
        }
        if (!requestOrigin) {
            return next.handle(input, context);
        }

        const method = req.method as string;

        return defer(async () => {
            const options = this.options || {};
            let origin: string | undefined;

            if (isFunction(options.origin)) {
                const result = options.origin(req as http.IncomingMessage);
                origin = isPromise(result) ? await result : result;
                if (!origin) {
                    return await lastValueFrom(next.handle(input, context));
                }
            } else if (options.origin) {
                origin = options.origin;
            } else {
                if (options.credentials === true) {
                    return await lastValueFrom(next.handle(input, context));
                }
                origin = requestOrigin;
            }

            const headersSet: Record<string, any> = {};
            const set = (key: string, value: any) => {
                res.setHeader(key, value);
                headersSet[key] = value;
            };

            if (method !== 'OPTIONS') {
                set(ACCESS_CONTROL_ALLOW_ORIGIN, origin);
                if (options.credentials === true) {
                    set(ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true');
                }
                if (options.exposeHeaders) {
                    set(ACCESS_CONTROL_EXPOSE_HEADERS, options.exposeHeaders);
                }
                if (!options.keepHeadersOnError) {
                    return await lastValueFrom(next.handle(input, context));
                }
                try {
                    return await lastValueFrom(next.handle(input, context));
                } catch (err: any) {
                    const errHeadersSet = err.headers || {};
                    const varyWithOrigin = appendHeader(errHeadersSet.vary || errHeadersSet.Vary || '', ORIGIN);
                    delete errHeadersSet.Vary;
                    err.headers = {
                        ...errHeadersSet,
                        ...headersSet,
                        vary: varyWithOrigin,
                    };
                    if (err.status) {
                        err.statusMessage = Number(err.status) >= 500 ? 'Internal Server Error' : (err.message || err.toString() || '');
                        throw err;
                    }
                    throw new InternalServerException();
                }
            } else {
                if (!(req.headers[ACCESS_CONTROL_REQUEST_METHOD] || req.headers[ACCESS_CONTROL_REQUEST_METHOD.toLowerCase()])) {
                    return await lastValueFrom(next.handle(input, context));
                }

                res.setHeader(ACCESS_CONTROL_ALLOW_ORIGIN, origin);
                if (options.credentials === true) {
                    res.setHeader(ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true');
                }
                if (options.maxAge) {
                    res.setHeader(ACCESS_CONTROL_MAX_AGE, String(options.maxAge));
                }
                if (options.allowMethods) {
                    res.setHeader(ACCESS_CONTROL_ALLOW_METHODS, options.allowMethods);
                }
                let allowHeaders = options.allowHeaders;
                if (!allowHeaders) {
                    allowHeaders = (req.headers[ACCESS_CONTROL_REQUEST_HEADERS] || req.headers[ACCESS_CONTROL_REQUEST_HEADERS.toLowerCase()]) as string;
                }
                if (allowHeaders) {
                    res.setHeader(ACCESS_CONTROL_ALLOW_HEADERS, allowHeaders);
                }
                res.statusCode = HttpStatusCode.NoContent;
                res.end();
            }
        });
    }
}

export { Cors as CorsMiddleware, Cors as CorsInterceptor };

const ACCESS_CONTROL_ALLOW_CREDENTIALS = 'access-control-allow-credentials';
const ACCESS_CONTROL_ALLOW_HEADERS = 'access-control-allow-headers';
const ACCESS_CONTROL_ALLOW_METHODS = 'access-control-allow-methods';
const ACCESS_CONTROL_ALLOW_ORIGIN = 'access-control-allow-origin';
const ACCESS_CONTROL_EXPOSE_HEADERS = 'access-control-expose-headers';
const ACCESS_CONTROL_MAX_AGE = 'access-control-max-age';
const ACCESS_CONTROL_REQUEST_HEADERS = 'access-control-request-headers';
const ACCESS_CONTROL_REQUEST_METHOD = 'access-control-request-method';
const allowMethods = 'GET,HEAD,PUT,POST,DELETE,PATCH';

interface Options {
    origin?: string | ((req: http.IncomingMessage) => any);
    allowMethods?: string;
    exposeHeaders?: string;
    allowHeaders?: string;
    maxAge?: string;
    credentials?: boolean;
    keepHeadersOnError?: boolean;
}

const VARY = 'vary';

function vary(res: HttpServResponse, field: string) {
    let val = res.getHeader?.(VARY) ?? '';
    const header = Array.isArray(val) ? val.join(', ') : String(val);
    const result = appendHeader(header, field);
    if (result) {
        res.setHeader(VARY, result);
    }
}

function appendHeader(header: string, field: string): string | false {
    if (!header) return field;
    if (!field) return false;
    const fields = header.split(/\s*,\s*/);
    if (fields.includes(field)) return false;
    return header + ', ' + field;
}
