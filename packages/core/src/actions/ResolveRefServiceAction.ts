import { Singleton, isArray, IocCompositeAction, InjectReference } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';

@Singleton
export class ResolveRefServiceAction extends IocCompositeAction<ServiceResolveContext> {
    execute(ctx: ServiceResolveContext, next?: () => void): void {
        if (ctx.targetType) {
            let currTk = ctx.token;
            if (!ctx.tokens.some(tk => {
                let refTk = ctx.refTargetFactory ? ctx.refTargetFactory(tk, ctx.targetType) : new InjectReference(tk, ctx.targetType);
                let refTks = isArray(refTk) ? refTk : [refTk];
                return refTks.some(reftk => {
                    ctx.token = reftk;
                    super.execute(ctx, next);
                    return !!ctx.instance;
                })
            })) {
                ctx.token = currTk;
                next();
            }

        } else {
            next();
        }
    }
}
