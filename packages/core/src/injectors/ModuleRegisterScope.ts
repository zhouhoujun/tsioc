import { Type, isArray } from '@tsdi/ioc';
import { InjectorScope } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { RegisterTypeAction } from './RegisterTypeAction';

export abstract class ModuleRegisterScope extends InjectorScope {

    execute(ctx: InjectorActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected abstract getTypes(ctx: InjectorActionContext): Type<any>[];

    protected registerTypes(ctx: InjectorActionContext, types: Type<any>[]) {
        if (isArray(types) && types.length) {
            types.forEach(ty => {
                if (!this.container.has(ty)) {
                    ctx.currType = ty;
                    super.execute(ctx);
                }
            });
        }
    }

    setup() {
        this.registerAction(RegisterTypeAction);
        this.use(RegisterTypeAction);
    }
}
