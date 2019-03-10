import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { RuntimeLifeScope } from '../services';


export class ConstructorArgsAction extends IocRegisterAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.params || !ctx.args) {
            ctx.params = this.container.resolve(RuntimeLifeScope).getConstructorParameters(this.container, ctx.targetType);
            ctx.args = this.container.createSyncParams(ctx.params, ctx.providerMap);
        }
        next();
    }
}
