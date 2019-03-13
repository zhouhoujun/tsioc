import { Singleton, isArray, InjectReference, isToken } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { TargetRefService } from '../TargetService';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';

@Singleton
export class ResolveRefServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.currTargetRef
            && (isToken(ctx.currTargetRef) || ctx.currTargetRef instanceof TargetRefService)
            && ctx.currToken) {

            let tk = ctx.currToken;
            let targetType = isToken(ctx.currTargetRef) ? ctx.currTargetRef : ctx.currTargetRef.getType();
            let refTk = ctx.refTargetFactory ? ctx.refTargetFactory(tk, targetType) : new InjectReference(tk, targetType);
            let refTks = isArray(refTk) ? refTk : [refTk];
            if (!refTks.some(tk => {
                this.resolvePrivate(ctx, tk);
                if (!ctx.instance) {
                    this.resolve(ctx, tk);
                }
                return !!ctx.instance;
            })) {
                ctx.currToken = tk;
                next();
            }

        } else {
            next();
        }
    }
}
