import { InjectorActionContext, InjectorRegisterScope } from '@tsdi/core';
import { Type, hasOwnClassMetadata } from '@tsdi/ioc';
import { RegisterDIModuleAction } from './RegisterDIModuleAction';

export class DIModuleInjectorScope extends InjectorRegisterScope {

    execute(ctx: InjectorActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types.filter(ty => hasOwnClassMetadata(ctx.currDecoractor, ty));
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type<any>[]) {
        ctx.types = [];
    }

    setup() {
        this.use(RegisterDIModuleAction);
    }
}
