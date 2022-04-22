import { Middleware, TransportContext } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';


@Injectable()
export class HelmetMiddleware implements Middleware {

    private options: HelmentOptions
    constructor(options: HelmentOptions) {
        this.options = {
            dnsPrefetch: 'off',
            ...options
        };
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        this.options.dnsPrefetch && ctx.setHeader('X-DNS-Prefetch-Control', this.options.dnsPrefetch)
        await next();
    }

}

@Abstract()
export abstract class HelmentOptions {
    readonly dnsPrefetch?: 'on' | 'off';
}
