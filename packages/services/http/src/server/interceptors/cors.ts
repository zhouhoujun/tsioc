import { Abstract, Injectable, isArray, isFunction, isPromise, Optional } from '@tsdi/ioc';
import { RequestMethod, InternalServerExecption, hdr, append, vary } from '@tsdi/common';
import { Middleware, TransportContext } from '@tsdi/endpoints';
import { Handler, Interceptor } from '@tsdi/core';
import { defer, lastValueFrom, Observable } from 'rxjs';



/**
 * cors options.
 */
@Abstract()
export abstract class CorsOptions {
    /**
     * origin.
     *
     * @memberof CorsOptions
     */
    origin?: string | ((ctx: TransportContext) => string | Promise<string>);
    /**
     * enable Access-Control-Allow-Credentials
     *
     * @type {boolean}
     * @memberof CorsOptions
     */
    credentials?: boolean;
    /**
     * set request Access-Control-Expose-Headers
     *
     * @type {string}
     * @memberof CorsOptions
     */
    exposeHeaders?: string;
    /**
     * keep headers on error.
     *
     * @type {boolean}
     * @memberof CorsOptions
     */
    keepHeadersOnError?: boolean;
    /**
     * allow cors request methods
     *
     * @type {(string | (string | RequestMethod)[])}
     * @memberof CorsOptions
     */
    allowMethods?: string | (string | RequestMethod)[];
    /**
     * allow cors request headers, 'Access-Control-Request-Headers'
     *
     * @type {(string | string[])}
     * @memberof CorsOptions
     */
    allowHeaders?: string | string[];
    /**
     * set cors cache max age.  Access-Control-Max-Age.
     *
     * @type {number}
     * @memberof CorsOptions
     */
    maxAge?: number | string;
}


@Injectable()
export class Cors implements Middleware<TransportContext>, Interceptor<TransportContext> {

    private options: Options;

    constructor(@Optional() options: CorsOptions) {

        this.options = this.parseOption({
            allowMethods,
            ...options
        })
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

        return options as Options
    }

    intercept(ctx: TransportContext, next: Handler<TransportContext, any>): Observable<any> {
        const requestOrigin = ctx.getHeader(hdr.ORIGIN);
        !ctx.sent && vary(ctx.response, hdr.ORIGIN);
        if (!requestOrigin) {
            return next.handle(ctx)
        }

        return defer(async () => {
            let options = this.options || {};

            let origin;
            if (isFunction(options.origin)) {
                origin = options.origin(ctx);

                if (isPromise(origin)) {
                    origin = await origin;
                }
                if (!origin) {
                    return await lastValueFrom(next.handle(ctx));
                }

            } else {
                origin = options.origin || requestOrigin
            }

            const headersSet: any = {};

            const set = (key: string, value: any) => {
                ctx.setHeader(key, value);
                headersSet[key] = value
            };

            if (ctx.method !== 'OPTIONS') {
                set(hdr.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
                if (options.credentials === true) {
                    set(hdr.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
                }

                if (options.exposeHeaders) {
                    set(hdr.ACCESS_CONTROL_EXPOSE_HEADERS, options.exposeHeaders)
                }

                if (!options.keepHeadersOnError) {
                    return await lastValueFrom(next.handle(ctx));
                }

                try {
                    await lastValueFrom(next.handle(ctx));
                } catch (err: any) {
                    const errHeadersSet = err.headers || {};
                    const varyWithOrigin = append(errHeadersSet.vary || errHeadersSet.Vary || '', 'Origin');
                    delete errHeadersSet.Vary;

                    err.headers = {
                        ...errHeadersSet,
                        ...headersSet,
                        ...{ vary: varyWithOrigin },
                    };
                    const statusMessage = err.message || err.toString() || '';
                    if (err.status) {
                        err.statusMessage = statusMessage;
                        throw err;
                    } else {
                        throw new InternalServerExecption(statusMessage);
                    }
                }
            } else {
                if (!ctx.getHeader(hdr.ACCESS_CONTROL_REQUEST_METHOD)) {
                    // this not preflight request, ignore it
                    return await lastValueFrom(next.handle(ctx));
                }

                options = this.options;
                ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_ORIGIN, origin);

                if (options.credentials === true) {
                    ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
                }

                const maxAge = String(options.maxAge);
                if (maxAge) {
                    ctx.setHeader(hdr.ACCESS_CONTROL_MAX_AGE, maxAge)
                }

                if (options.allowMethods) {
                    ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_METHODS, options.allowMethods)
                }

                let allowHeaders = options.allowHeaders;
                if (!allowHeaders) {
                    allowHeaders = ctx.getHeader(hdr.ACCESS_CONTROL_REQUEST_HEADERS) as string
                }
                if (allowHeaders) {
                    ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_HEADERS, allowHeaders)
                }
                ctx.status = ctx.session.statusAdapter!.noContent;
            }
        });

    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const requestOrigin = ctx.getHeader(hdr.ORIGIN);
        !ctx.sent && vary(ctx.response, hdr.ORIGIN);
        if (!requestOrigin) {
            return await next()
        }

        let options = this.options || {};

        let origin;
        if (isFunction(options.origin)) {
            origin = options.origin(ctx);
            if (isPromise(origin)) {
                origin = await origin
            }
            if (!origin) {
                return await next()
            }
        } else {
            origin = options.origin || requestOrigin
        }
        const headersSet: any = {};

        const set = (key: string, value: any) => {
            ctx.setHeader(key, value);
            headersSet[key] = value
        };

        if (ctx.method !== 'OPTIONS') {
            set(hdr.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            if (options.credentials === true) {
                set(hdr.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
            }

            if (options.exposeHeaders) {
                set(hdr.ACCESS_CONTROL_EXPOSE_HEADERS, options.exposeHeaders)
            }

            if (!options.keepHeadersOnError) {
                return await next()
            }

            try {
                await next()
            } catch (err: any) {
                const errHeadersSet = err.headers || {};
                const varyWithOrigin = append(errHeadersSet.vary || errHeadersSet.Vary || '', 'Origin');
                delete errHeadersSet.Vary;

                err.headers = {
                    ...errHeadersSet,
                    ...headersSet,
                    ...{ vary: varyWithOrigin },
                };
                const statusMessage = err.message || err.toString() || '';
                if (err.status) {
                    err.statusMessage = statusMessage;
                    throw err;
                } else {
                    throw new InternalServerExecption(statusMessage);
                }
            }
        } else {
            if (!ctx.getHeader(hdr.ACCESS_CONTROL_REQUEST_METHOD)) {
                // this not preflight request, ignore it
                return await next()
            }

            options = this.options;
            ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_ORIGIN, origin);

            if (options.credentials === true) {
                ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
            }

            const maxAge = String(options.maxAge);
            if (maxAge) {
                ctx.setHeader(hdr.ACCESS_CONTROL_MAX_AGE, maxAge)
            }

            if (options.allowMethods) {
                ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_METHODS, options.allowMethods)
            }

            let allowHeaders = options.allowHeaders;
            if (!allowHeaders) {
                allowHeaders = ctx.getHeader(hdr.ACCESS_CONTROL_REQUEST_HEADERS) as string
            }
            if (allowHeaders) {
                ctx.setHeader(hdr.ACCESS_CONTROL_ALLOW_HEADERS, allowHeaders)
            }
            ctx.status = ctx.session.statusAdapter!.noContent;
        }
    }
}

/**
 * default cors all methods.
 */
const allowMethods = 'GET,HEAD,PUT,POST,DELETE,PATCH';

interface Options {
    /**
     * origin `Access-Control-Allow-Origin`, default is request Origin header
     */
    origin?: string | ((ctx: TransportContext) => any);
    /**
     * allowMethods `Access-Control-Allow-Methods`, default is 'GET,HEAD,PUT,POST,DELETE,PATCH'
     */
    allowMethods?: string;
    /**
     * exposeHeaders `Access-Control-Expose-Headers`
     */
    exposeHeaders?: string;
    /**
     * allowHeaders `Access-Control-Allow-Headers`
     */
    allowHeaders?: string;
    /**
     *  `Access-Control-Max-Age` in seconds
     */
    maxAge?: string;
    /**
     *  `Access-Control-Allow-Credentials` all or not.
     */
    credentials?: boolean;
    /**
     * keep headers on error.
     */
    keepHeadersOnError?: boolean;
}
