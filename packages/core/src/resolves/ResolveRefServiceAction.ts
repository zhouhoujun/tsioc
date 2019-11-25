import { isArray, InjectReference } from '@tsdi/ioc';
import { ResolveServiceContext  } from './ResolveServiceContext';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TOKEN } from '../context-tokens';

export class ResolveRefServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        let currToken = ctx.get(CTX_CURR_TOKEN);
        if (currToken && !(currToken instanceof InjectReference) && ctx.has(CTX_CURR_TARGET_REF)) {
            let currtk = currToken;
            let targetTk = ctx.get(CTX_CURR_TARGET_TOKEN);
            let options = ctx.getOptions();
            let refTk = options.refTargetFactory ? options.refTargetFactory(targetTk, currtk) : new InjectReference(currtk, targetTk);
            let refTks = isArray(refTk) ? refTk : [refTk];
            if (!refTks.some(tk => {
                this.resolvePrivate(ctx, tk);
                if (!ctx.instance) {
                    this.get(ctx, tk);
                }
                return !!ctx.instance;
            })) {
                ctx.set(CTX_CURR_TOKEN, currtk);
                next();
            }

        } else {
            next();
        }
    }
}
