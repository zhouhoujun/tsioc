import { Middleware, TransportContext } from '@tsdi/core';
import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
import { hdr } from '../consts';


@Abstract()
export abstract class HelmentOptions {
    readonly dnsPrefetch?: 'on' | 'off';
}

@Injectable()
export class HelmetMiddleware implements Middleware {

    private options: HelmentOptions
    constructor(@Nullable() options: HelmentOptions) {
        this.options = {
            dnsPrefetch: 'off',
            ...options
        };
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        this.options.dnsPrefetch && ctx.setHeader(hdr.X_DNS_PREFETCH_CONTROL, this.options.dnsPrefetch)
        await next();
    }

}
