import { InjectorActionContext, ModuleRegisterScope } from '@tsdi/core';
import { hasClassMetadata, Type } from '@tsdi/ioc';
import { RegisterDIModuleAction } from './RegisterDIModuleAction';

export class DIModuleRegisterScope extends ModuleRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types.filter(ty => hasClassMetadata(ctx.currDecoractor, ty));
    }

    setup() {
        this.registerAction(RegisterDIModuleAction);
        this.use(RegisterDIModuleAction);
    }
}
