import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeLifeScope } from '../../services';

/**
 * resolve constructor args action.
 *
 * @export
 * @class ConstructorArgsAction
 * @extends {IocRuntimeAction}
 */
export class ConstructorArgsAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (!ctx.params || !ctx.args) {
            ctx.params = this.container.resolve(RuntimeLifeScope).getConstructorParameters(this.container, ctx.targetType);
            ctx.args = this.container.createSyncParams(ctx.params, ctx.providerMap);
        }
        next();
    }
}
