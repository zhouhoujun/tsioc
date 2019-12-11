import { IocResolveScope, isClassType, isToken } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { TargetService } from '../TargetService';
import { ResolveRefServiceAction } from './ResolveRefServiceAction';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TYPE, CTX_CURR_TARGET_TOKEN } from '../context-tokens';

export class ResolveServiceInClassChain extends IocResolveScope {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.has(CTX_CURR_TARGET_REF)) {
            let currTgRef = ctx.get(CTX_CURR_TARGET_REF);
            let classType = ctx.get(CTX_CURR_TARGET_TYPE);
            let currTagTk = ctx.get(CTX_CURR_TARGET_TOKEN);
            let injector = ctx.injector;
            if (isClassType(classType)) {
                ctx.reflects.getExtends(classType).some(ty => {
                    let tgRef = currTgRef instanceof TargetService ? currTgRef.clone(ty) : ty;
                    let tk = isToken(tgRef) ? tgRef : tgRef.getToken();
                    let ctype = isClassType(tk) ? tk : injector.getTokenProvider(tk);
                    ctx.set(CTX_CURR_TARGET_REF, tgRef);
                    ctx.set(CTX_CURR_TARGET_TOKEN, tk);
                    isClassType(ctype) ? ctx.set(CTX_CURR_TARGET_TYPE, ctype) : ctx.remove(CTX_CURR_TARGET_TYPE);
                    super.execute(ctx);
                    return ctx.instance;
                });
            } else {
                super.execute(ctx);
            }
            if (!ctx.instance) {
                ctx.set(CTX_CURR_TARGET_REF, currTgRef);
                ctx.set(CTX_CURR_TARGET_TOKEN, currTagTk);
                isClassType(classType) ? ctx.set(CTX_CURR_TARGET_TYPE, classType) : ctx.remove(CTX_CURR_TARGET_TYPE);
                next && next();
            }
        } else {
            next && next();
        }
    }

    setup() {
        this.use(ResolveRefServiceAction)
            .use(ResolvePrivateServiceAction);
    }
}
