import { InjectorActionContext } from './InjectorActionContext';
import { hasClassMetadata, Type } from '@tsdi/ioc';
import { ModuleRegisterScope } from './ModuleRegisterScope';

export class IocExtRegisterScope extends ModuleRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types.filter(ty => hasClassMetadata(ctx.currDecoractor, ty));
    }
}
