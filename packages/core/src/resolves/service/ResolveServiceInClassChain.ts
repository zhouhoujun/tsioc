import { isClassType, isNullOrUndefined, IocResolveAction } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TARGET_TYPE, CTX_CURR_TOKEN } from '../../context-tokens';

export class ResolveServiceInClassChain extends IocResolveAction  {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.has(CTX_CURR_TARGET_TYPE)) {
            let classType = ctx.get(CTX_CURR_TARGET_TYPE);
            let injector = ctx.injector;
            if (isClassType(classType)) {
                ctx.reflects.getExtends(classType).some(ty => {
                    ctx.instance = injector.resolve({ token: ctx.get(CTX_CURR_TOKEN), target: ty })
                    return ctx.instance;
                });
            }
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
