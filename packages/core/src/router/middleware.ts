import { Injectable } from '@tsdi/ioc';
import { Middleware, TransportContext } from '../transport';
import { RouterResolver } from './router';

@Injectable()
export class RouterMiddleware implements Middleware {
    constructor(private resolver: RouterResolver) { }

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const router = this.resolver.match(ctx.pathname);
        if (router) {
            return router.invoke(ctx, next)
        } else {
            return next();
        }
    }

}
