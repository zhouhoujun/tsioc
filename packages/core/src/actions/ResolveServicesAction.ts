import { Singleton, IocCompositeAction, ProviderMap } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServicesContext } from './IocResolveServicesAction';


@Singleton
export class ResolveServicesAction extends IocCompositeAction<ResolveServiceContext> {

    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx instanceof ResolveServicesContext) {
            ctx.services = ctx.resolve(ProviderMap);
            super.execute(ctx);
        } else {
            next();
        }
    }
}
