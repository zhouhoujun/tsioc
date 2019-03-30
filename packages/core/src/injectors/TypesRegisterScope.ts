import { Type } from '@tsdi/ioc';
import { ModuleRegisterScope } from './ModuleRegisterScope';
import { InjectorActionContext } from './InjectorActionContext';

export class TypesRegisterScope extends ModuleRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type<any>[] {
        return ctx.types;
    }
}
