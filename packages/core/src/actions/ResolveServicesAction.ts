import { Singleton } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IteratorService } from '../services';
import { IocResolveServiceAction } from './IocResolveServiceAction';


@Singleton
export class ResolveServicesAction extends IocResolveServiceAction {

    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.all) {
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
