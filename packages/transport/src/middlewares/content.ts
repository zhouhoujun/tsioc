import { Middleware, AssetContext, HEAD, GET } from '@tsdi/core';
import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
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
export class ContentMiddleware implements Middleware<AssetContext> {

    private options: ContentOptions
    constructor(private vaildator: StatusVaildator, @Nullable() options: ContentOptions) {
        this.options = { ...defOpts, ...options };
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        if (this.options.defer) {
            await next()
        }
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
        if (!this.options.defer && !file) {
            await next()
        }
    }

}

export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    immutable: false,

}

