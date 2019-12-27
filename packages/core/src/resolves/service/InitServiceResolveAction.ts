import { isToken, isArray, IocResolveAction } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_TARGET_REFS } from '../../context-tokens';

export class InitServiceResolveAction extends IocResolveAction<ResolveServiceContext>  {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        let options = ctx.getOptions();
        if (options.target) {
            let targets = (isArray(options.target) ? options.target : [options.target]).filter(t => t);
            if (targets.length) {
                ctx.set(CTX_TARGET_REFS, targets);
            }
        }
        options.tokens = options.tokens || [];
        if (ctx.token) {
            ctx.tokens.push(ctx.token);
        }
        options.tokens = options.tokens.filter(t => isToken(t));
        next();
    }
}
