import { Singleton, IocCompositeAction } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';


@Singleton
export class ResolveServicesAction extends IocCompositeAction<ResolveServiceContext> {

    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.all) {
            ctx.instance = [];
            super.execute(ctx);
        } else {
            next();
        }
    }
}
