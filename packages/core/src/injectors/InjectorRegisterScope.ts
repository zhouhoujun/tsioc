import { Type, isArray } from '@tsdi/ioc';
import { InjectorScope } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { RegisterTypeAction } from './RegisterTypeAction';
import { CTX_CURR_TYPE } from '../context-tokens';

export abstract class InjectorRegisterScope extends InjectorScope {

    execute(ctx: InjectorActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected abstract getTypes(ctx: InjectorActionContext): Type[];

    protected registerTypes(ctx: InjectorActionContext, types: Type[]) {
        if (isArray(types) && types.length) {
            types.forEach(ty => {
                if (!ctx.injector.has(ty)) {
                    ctx.set(CTX_CURR_TYPE, ty);
                    super.execute(ctx);
                }
            });
            this.setNextRegTypes(ctx, types);
        }
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

    setup() {
        this.use(RegisterTypeAction);
    }
}
