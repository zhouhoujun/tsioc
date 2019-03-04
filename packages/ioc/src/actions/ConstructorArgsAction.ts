import { IocAction, IocActionContext } from './Action';
import { RuntimeLifeScope } from '../services';


export class ConstructorArgsAction extends IocAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.params || !ctx.args) {
            ctx.params = this.container.resolve(RuntimeLifeScope).getConstructorParameters(this.container, ctx.targetType);
            ctx.args = this.container.createSyncParams(ctx.params, ctx.providerMap);
        }
        next();
    }
}
