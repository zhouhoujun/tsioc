import { RuntimeActionContext, IocRuntimeAction } from '@tsdi/ioc';
import { AOP_EXTEND_TARGET_TOKEN } from '../IAdvisor';

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
        let providers = ctx.providers;
        if (providers.has(AOP_EXTEND_TARGET_TOKEN)) {
            providers.get(AOP_EXTEND_TARGET_TOKEN)(ctx.target);
        }
        next();
    }
}
