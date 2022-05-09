import { Middleware, TransportContext, TransportError } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { SendAdapter, SendOption } from './send';

@Abstract()
export abstract class ContentOptions implements SendOption {
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
            await next();
        }
        let file = '';
        if (ctx.method === 'HEAD' || ctx.method === 'GET') {
            try {
                let sender = ctx.injector.get(SendAdapter);
                file = await sender.send(ctx, this.options);
            } catch (err) {
                if ((err as TransportError).status !== 404) {
                    throw err;
                }
            }
        }
        if (!this.options.defer && !file) {
            await next();
        }
    }

}

export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    immutable: false,

}

