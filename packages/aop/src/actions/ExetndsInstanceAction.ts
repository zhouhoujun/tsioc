import { ExtendsProvider, RuntimeActionContext, IocRuntimeAction, CTX_PROVIDERS } from '@tsdi/ioc';

/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {IocRuntimeAction}
 */
export class ExetndsInstanceAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        // aspect class do nothing.
        let providers = ctx.getContext(CTX_PROVIDERS);
        if (providers && providers.length) {
            providers.forEach(p => {
                if (p && p instanceof ExtendsProvider) {
                    p.extends(ctx.target);
                }
            });
        }
        next();
    }
}
