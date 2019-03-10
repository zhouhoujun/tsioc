import { IocResolveAction } from '@ts-ioc/ioc';
import { ServiceResolveContext } from '../ServiceResolveContext';
import { IteratorService } from '../services';

export class ServicesResolveAction extends IocResolveAction {

    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx instanceof ServiceResolveContext && ctx.all) {
            let services: any[] = [];
            ctx.resolve(IteratorService)
                .each(
                    (tk, fac, resolver, ...pds) => {
                        services.push(fac(...pds));
                    },
                    ctx.token,
                    ctx.target,
                    ctx.both,
                    ...ctx.providers);
            ctx.instance = services;

        } else {
            next();
        }
    }
}
