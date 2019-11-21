import {
    IocDesignAction, IocRuntimeAction, lang, Type, RuntimeActionContext,
    DesignActionContext, IocCompositeAction, ActionRegisterer, CTX_ACTION_SCOPE
} from '@tsdi/ioc';
import { ParentContainerToken } from '../ContainerPoolToken';

export class RouteRuntimRegisterAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.has(CTX_ACTION_SCOPE) && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_ACTION_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionRegisterer).get(scopeType).execute(ctx, next);
            }
        } else {
            next();
        }
    }
}

export class RouteDesignRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (ctx.has(CTX_ACTION_SCOPE) && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_ACTION_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionRegisterer).get(scopeType).execute(ctx, next);
            }
        } else {
            next();
        }
    }
}

