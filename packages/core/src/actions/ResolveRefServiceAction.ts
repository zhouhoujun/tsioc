import { Singleton, isArray, InjectReference, isToken } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { TargetRefService } from '../TargetService';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';

@Singleton
export class ResolveRefServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.currToken && (isToken(ctx.currTargetRef) || ctx.currTargetRef instanceof TargetRefService)) {
            let currtk = ctx.currToken;
            let targetType = isToken(ctx.currTargetRef) ? ctx.currTargetRef : ctx.currTargetRef.getToken();
            let refTk = ctx.refTargetFactory ? ctx.refTargetFactory(targetType, currtk) : new InjectReference(currtk, targetType);
            let refTks = isArray(refTk) ? refTk : [refTk];
            if (!refTks.some(tk => {
                this.resolvePrivate(ctx, tk);
                if (!ctx.instance) {
                    this.resolve(ctx, tk);
                }
                return !!ctx.instance;
            })) {
                ctx.currToken = currtk;
                next();
            }

        } else {
            next();
        }
    }
}
