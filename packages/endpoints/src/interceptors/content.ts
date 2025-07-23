import { Abstract, Injectable, isDefined } from '@tsdi/ioc';
import { ApplicationInterceptor, ApplicationHandler } from '@tsdi/core';
import { GET, HEAD } from '@tsdi/common';
import { NotFoundException } from '@tsdi/common/transport';
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';



/**
 * static content resources.
 */
@Injectable()
export class ContentInterceptor implements ApplicationInterceptor<RequestContext> {

    options?: ContentOptions;

    constructor() { }


    intercept(input: RequestContext, next: ApplicationHandler<RequestContext, any>): Observable<any> {
        if (!(!input.method || input.method === HEAD || input.method === GET || input.method === '*')
            || !input.originalUrl) {
            return next.handle(input);
        }

        const options = this.options ?? { ...defOpts, ...input.serverOptions.content };
        if (options.defer) {
            return next.handle(input)
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
                        if (!file) return next.handle(input)
                        return of(file);
                    })
                )
        }
    }

    protected async send(ctx: RequestContext, options: ContentOptions) {
        let file = '';
        if (ctx.statusAdapter && (isDefined(ctx.status) && !ctx.statusAdapter.isNotFound(ctx.status))) return file;

        const sender = ctx.injector.get(ContentSendAdapter);

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
export abstract class ContentSendAdapter {
    /**
     * send file by request context
     * @param ctx RequestContext
     * @param path file path
     * @param options send options
     */
    abstract send(ctx: RequestContext, path: string, options: SendOptions): Promise<string>;
}


export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,

}

