import { IocCompositeAction, lang, Singleton } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';

@Singleton
export class ResolveServiceInClassChain extends IocCompositeAction<ServiceResolveContext> {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        let currTgt = ctx.targetType;
        if (ctx.targetType) {
            lang.forInClassChain(ctx.targetType, ty => {
                if (ty === currTgt) {
                    return true;
                }
                ctx.targetType = ty;
                super.execute(ctx, next);
                if (ctx.instance) {
                    return false;
                }
                return true;
            });
            if (!ctx.instance) {
                ctx.targetType = currTgt;
                next();
            }
        } else {
            next();
        }
    }
}
