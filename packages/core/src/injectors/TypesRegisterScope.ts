import { ModuleRegisterScope } from './ModuleRegisterScope';
import { InjectorActionContext } from './InjectorActionContext';
import { Type } from '@tsdi/ioc';

export class TypesRegisterScope extends ModuleRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types;
    }
}
