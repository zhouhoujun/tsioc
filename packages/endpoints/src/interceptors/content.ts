import { Abstract, Injectable } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import { GET, HEAD, MESSAGE } from '@tsdi/common';
import { NotFoundExecption } from '@tsdi/common/transport';
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { Middleware } from '../middleware/middleware';
import { RequestContext } from '../RequestContext';



/**
 * static content resources.
 */
@Injectable()
export class ContentInterceptor implements Middleware<RequestContext>, Interceptor<RequestContext> {

    options?: ContentOptions;

    constructor() { }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx.method === HEAD || ctx.method === GET || ctx.method === MESSAGE)
            || !ctx.getRequestFilePath()) {
            return next();
        }

        const options = this.options ?? { ...defOpts, ...ctx.serverOptions.content };
        if (options.defer) {
            try {
                await next()
            } catch (err: any) {
                if (err instanceof NotFoundExecption) {
                    await this.send(ctx, options);
                    return;
                }
                throw err;
            }
        }
        const file = await this.send(ctx, options);
        if (!options.defer && !file) {
            await next()
        }
    }

    intercept(input: RequestContext, next: Handler<RequestContext, any>): Observable<any> {
        if (!(input.method === HEAD || input.method === GET || input.method === MESSAGE)
            || !input.getRequestFilePath()) {
            return next.handle(input);
        }

        const options = this.options ?? { ...defOpts, ...input.serverOptions.content };
        if (options.defer) {
            return next.handle(input)
                .pipe(
                    mergeMap(async res => {
                        const file = await this.send(input, options)
                        if (!file) {
                            return throwError(() => new NotFoundExecption())
                        }
                    })
                )
        } else {
            return from(this.send(input, options))
                .pipe(
                    mergeMap(file => {
                        if (!file) return next.handle(input)
                        return of(file);
                    })
                )
        }
    }

    protected async send(ctx: RequestContext, options: ContentOptions) {
        let file = '';

        const sender = ctx.injector.get(ContentSendAdapter);
        if (!sender.canSend(ctx)) return file;

        file = await sender.send(ctx, options);

        return file;
    }

    static create(options?: ContentOptions): ContentInterceptor {
        const ct = new ContentInterceptor();
        ct.options = options;
        return ct;
    }

}

export interface SendOptions<TStats = any> {
    root: string | string[];
    prefix?: string;
    baseUrl?: string | boolean;
    index?: string | boolean;
    maxAge?: number;
    immutable?: boolean;
    hidden?: boolean;
    format?: boolean;
    extensions?: string[] | false;
    brotli?: boolean;
    gzip?: boolean;
    setHeaders?: (ctx: RequestContext, path: string, stats: TStats) => void;
}


/**
 * Static Content options.
 */

export interface ContentOptions extends SendOptions {
    defer?: boolean;
}

/**
 * Content send adapter.
 */
@Abstract()
export abstract class ContentSendAdapter<TStats = any> {
    abstract canSend(ctx: RequestContext): boolean;
    abstract send(ctx: RequestContext, options: SendOptions<TStats>): Promise<string>;
}


export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    defer: false,
    immutable: false,

}

