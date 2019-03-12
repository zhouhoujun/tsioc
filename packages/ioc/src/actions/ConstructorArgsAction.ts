import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { RuntimeLifeScope } from '../services';

/**
 * resolve constructor args action.
 *
 * @export
 * @class ConstructorArgsAction
 * @extends {IocRegisterAction}
 */
export class ConstructorArgsAction extends IocRegisterAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.params || !ctx.args) {
            ctx.params = this.container.get(RuntimeLifeScope).getConstructorParameters(this.container, ctx.targetType);
            ctx.args = this.container.createSyncParams(ctx.params, ctx.providerMap);
        }
        next();
    }
}
