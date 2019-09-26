import { Type } from '@tsdi/ioc';
import { InjectorActionContext } from './InjectorActionContext';
import { InjectorRegisterScope } from './InjectorRegisterScope';

export class IocExtRegisterScope extends InjectorRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.currDecoractor, ty));
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type[]) {
        ctx.types = [];
    }
}
