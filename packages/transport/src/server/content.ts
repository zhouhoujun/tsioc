import { Middleware, AssetContext, HEAD, GET, Interceptor, Handler } from '@tsdi/core';
import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
import { Observable, from, mergeMap, of } from 'rxjs';
import { ContentSendAdapter, SendOptions } from './send';
import { StatusVaildator } from '../status';

/**
 * Static Content options.
 */
@Abstract()
export abstract class ContentOptions implements SendOptions {
    abstract root: string | string[];
    abstract defer?: boolean;
    abstract index?: string;
    abstract maxAge?: number;
    abstract immutable?: boolean;
    abstract hidden?: boolean;
    abstract format?: boolean;
    abstract extensions?: string[] | false;
    abstract brotli?: boolean;
    abstract gzip?: boolean;
}

/**
 * static content resources.
 */
@Injectable()
export class Content implements Middleware<AssetContext>, Interceptor<AssetContext> {

    protected readonly options: ContentOptions
    constructor(protected readonly vaildator: StatusVaildator, @Nullable() options: ContentOptions) {
        this.options = { ...defOpts, ...options };
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        if (this.options.defer) {
            await next()
        }
        const file = await this.send(ctx);
        if (!this.options.defer && !file) {
            await next()
        }
    }

    intercept(input: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        if (this.options.defer) {
            return next.handle(input)
                .pipe(
                    mergeMap(async res => {
                        await this.send(input)
                        return res;
                    })
                )
        } else {
            return from(this.send(input))
                .pipe(
                    mergeMap(file => {
                        if (!file) return next.handle(input)
                        return of(file);
                    })
                )
        }
    }

    protected async send(ctx: AssetContext) {
        let file = '';
        if (ctx.method === HEAD || ctx.method === GET) {
            try {
                const sender = ctx.injector.get(ContentSendAdapter);
                file = await sender.send(ctx, this.options)
            } catch (err) {
                if (!this.vaildator.isNotFound((err as any).status)) {
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

