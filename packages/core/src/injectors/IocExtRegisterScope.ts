import { Type, CTX_CURR_DECOR } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';
import { InjectRegisterScope } from './InjectRegisterScope';

export class IocExtRegisterScope extends InjectRegisterScope {
    protected getTypes(ctx: InjectActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.get(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectActionContext, registered: Type[]) {
        ctx.types = [];
    }
}
