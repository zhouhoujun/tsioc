import { Type } from '@tsdi/ioc';
import { InjectRegisterScope } from './InjectRegisterScope';
import { InjectActionContext } from './InjectActionContext';

export class TypesRegisterScope extends InjectRegisterScope {
    protected getTypes(ctx: InjectActionContext): Type[] {
        return ctx.types;
    }
}
