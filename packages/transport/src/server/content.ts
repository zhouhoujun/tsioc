import { Middleware, AssetContext, HEAD, GET, Interceptor, Handler, MESSAGE } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable, from, mergeMap, of } from 'rxjs';
import { ContentSendAdapter, SendOptions } from './send';

/**
 * Static Content options.
 */

export interface ContentOptions extends SendOptions {
    defer?: boolean;
}

/**
 * static content resources.
 */
@Injectable()
export class Content implements Middleware<AssetContext>, Interceptor<AssetContext> {

    constructor() {
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        const options = { ...defOpts, ...ctx.serverOptions.content };
        if (options.defer) {
            await next()
        }
        const file = await this.send(ctx, options);
        if (!options.defer && !file) {
            await next()
        }
    }

    intercept(input: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        const options = { ...defOpts, ...input.serverOptions.content };
        if (options.defer) {
            return next.handle(input)
                .pipe(
                    mergeMap(async res => {
                        await this.send(input, options)
                        return res;
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

    protected async send(ctx: AssetContext, options: ContentOptions) {
        let file = '';
        if (ctx.method === HEAD || ctx.method === GET || ctx.method === MESSAGE) {
            try {
                const sender = ctx.injector.get(ContentSendAdapter);
                file = await sender.send(ctx, options)
            } catch (err) {
                if (!ctx.vaildator.isNotFound((err as any).status)) {
                    throw err
                }
            }
        }
        return file;
    }
}

export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    immutable: false,

}

