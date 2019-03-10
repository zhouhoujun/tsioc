import { Singleton, isArray, IocCompositeAction } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';

@Singleton
export class ResolveRefServiceAction extends IocCompositeAction<ServiceResolveContext> {
    execute(ctx: ServiceResolveContext, next?: () => void): void {
        if (ctx.refFactory) {
            let currTk = ctx.token;
            let tokens = [ctx.token, ctx.tokenType];
            if (!tokens.some(tk => {
                let refTk = ctx.refFactory(tk);
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
