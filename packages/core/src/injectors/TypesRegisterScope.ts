import { Type } from '@tsdi/ioc';
import { InjectorRegisterScope } from './InjectRegisterScope';
import { InjectActionContext } from './InjectActionContext';

export class TypesRegisterScope extends InjectorRegisterScope {
    protected getTypes(ctx: InjectActionContext): Type[] {
        return ctx.types;
    }
}
