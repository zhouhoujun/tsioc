import { Type, CTX_CURR_DECOR } from '@tsdi/ioc';
import { InjectorActionContext } from './InjectorActionContext';
import { InjectorRegisterScope } from './InjectorRegisterScope';

export class IocExtRegisterScope extends InjectorRegisterScope {
    protected getTypes(ctx: InjectorActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getContext(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type[]) {
        ctx.types = [];
    }
}
