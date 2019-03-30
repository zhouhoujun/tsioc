import { Type, hasOwnClassMetadata } from '@tsdi/ioc';
import { InjectorActionContext } from './InjectorActionContext';
import { ModuleRegisterScope } from './ModuleRegisterScope';

export class IocExtRegisterScope extends ModuleRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types.filter(ty => hasOwnClassMetadata(ctx.currDecoractor, ty));
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type<any>[]) {
        ctx.types = [];
    }
}
