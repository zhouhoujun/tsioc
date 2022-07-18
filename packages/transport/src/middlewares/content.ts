import { Middleware, mths, TransportContext, TransportError } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { ContentSendAdapter, SendOptions } from './send';

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
export class ContentMiddleware implements Middleware {

    private options: ContentOptions
    constructor(options: ContentOptions) {
        this.options = { ...defOpts, ...options };
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (this.options.defer) {
            await next()
        }
        let file = '';
        if (ctx.method === mths.HEAD || ctx.method === mths.GET) {
            try {
                const sender = ctx.injector.get(ContentSendAdapter);
                file = await sender.send(ctx, this.options)
            } catch (err) {
                if (!ctx.adapter.isNotFound((err as TransportError).status!)) {
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

