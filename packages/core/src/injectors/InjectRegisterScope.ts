import { Type, isArray, IActionSetup } from '@tsdi/ioc';
import { InjectScope } from './InjectAction';
import { InjectActionContext } from './InjectActionContext';
import { RegisterTypeAction } from './RegisterTypeAction';
import { CTX_CURR_TYPE } from '../context-tokens';

export abstract class InjectRegisterScope extends InjectScope implements IActionSetup {

    execute(ctx: InjectActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected abstract getTypes(ctx: InjectActionContext): Type[];

    protected registerTypes(ctx: InjectActionContext, types: Type[]) {
        if (isArray(types) && types.length) {
            let injector = ctx.injector;
            types.forEach(ty => {
                if (!injector.has(ty)) {
                    ctx.setValue(CTX_CURR_TYPE, ty);
                    super.execute(ctx);
                }
            });
            this.setNextRegTypes(ctx, types);
        }
    }

    protected setNextRegTypes(ctx: InjectActionContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

    setup() {
        this.use(RegisterTypeAction);
    }
}
