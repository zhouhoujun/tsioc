import { Abstract, Injectable, isDefined } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import { GET, HEAD, NotFoundException, RequestContext } from '@tsdi/common';
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';



/**
 * static content resources.
 */
@Injectable()
export class ContentInterceptor implements Interceptor<AbstractRequestContext> {

    options?: ContentOptions;

    constructor() { }


    intercept(input: AbstractRequestContext, next: Handler<AbstractRequestContext, any>, context: RequestContext): Observable<any> {
        if (!(!input.method || input.method === HEAD || input.method === GET || input.method === '*')
            || !input.originalUrl) {
            return next.handle(input, context);
        }

        const options = this.options ?? { ...defOpts, ...input.serverOptions.content };
        if (options.defer) {
            return next.handle(input, context)
                .pipe(
                    mergeMap(async res => {
                        const file = await this.send(input, options)
                        if (!file) {
                            return throwError(() => new NotFoundException())
                        }
                    })
                )
        } else {
            return from(this.send(input, options))
                .pipe(
                    mergeMap(file => {
                        if (!file) return next.handle(input, context)
                        return of(file);
                    })
                )
        }
    }

    protected async send(ctx: AbstractRequestContext, options: ContentOptions) {
        let file = '';
        if (ctx.statusAdapter && (isDefined(ctx.status) && !ctx.statusAdapter.isNotFound(ctx.status))) return file;

        const sender = ctx.get(ContentSendAdapter);

        file = await sender.send(ctx, ctx.originalUrl, options);

        return file;
    }

    static create(options?: ContentOptions): ContentInterceptor {
        const ct = new ContentInterceptor();
        ct.options = options;
        return ct;
    }

}

export interface SendOptions<TStats = any> {
    root?: string | string[];
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
    setHeaders?: (ctx: AbstractRequestContext, path: string, stats: TStats) => void;
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
export abstract class ContentSendAdapter {
    /**
     * send file by request context
     * @param ctx RequestContext
     * @param path file path
     * @param options send options
     */
    abstract send(ctx: AbstractRequestContext, path: string, options: SendOptions): Promise<string>;
}


export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,

}

