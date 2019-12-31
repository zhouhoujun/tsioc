import { isToken, isArray, IocResolveAction } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from '../../context-tokens';

export class InitServicesResolveAction extends IocResolveAction<ResolveServicesContext> {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        let options = ctx.getOptions();
        if (options.target) {
            let targets = (isArray(options.target) ? options.target : [options.target]).filter(t => t);
            if (targets.length) {
                ctx.set(CTX_TARGET_REFS, targets);
            }
        }

        options.tokens = options.tokens?.filter(t => isToken(t));

        next();
    }
}
