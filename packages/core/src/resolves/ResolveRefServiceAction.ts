import { isArray, InjectReference, isToken } from '@tsdi/ioc';
import { ResolveServiceContext, CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TOKEN, CTX_TARGET_REF_FACTORY } from './ResolveServiceContext';
import { TargetRefService } from '../TargetService';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';

export class ResolveRefServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        let currToken = ctx.getContext(CTX_CURR_TOKEN);
        if (currToken && !(currToken instanceof InjectReference) && ctx.hasContext(CTX_CURR_TARGET_REF)) {
            let currtk = currToken;
            let targetTk = ctx.getContext(CTX_CURR_TARGET_TOKEN);
            let refTk = ctx.hasContext(CTX_TARGET_REF_FACTORY) ? ctx.getContext(CTX_TARGET_REF_FACTORY)(targetTk, currtk) : new InjectReference(currtk, targetTk);
            let refTks = isArray(refTk) ? refTk : [refTk];
            if (!refTks.some(tk => {
                this.resolvePrivate(ctx, tk);
                if (!ctx.instance) {
                    this.get(ctx, tk);
                }
                return !!ctx.instance;
            })) {
                ctx.setContext(CTX_CURR_TOKEN, currtk);
                next();
            }

        } else {
            next();
        }
    }
}
