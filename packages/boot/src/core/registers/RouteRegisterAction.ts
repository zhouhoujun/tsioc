import {
    IocDesignAction, IocRuntimeAction, lang, Type, RuntimeActionContext,
    DesignActionContext, IocCompositeAction, ActionInjector, CTX_CURR_SCOPE
} from '@tsdi/ioc';

export class RouteRuntimRegisterAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.has(CTX_CURR_SCOPE) && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_CURR_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionInjector).get(scopeType).execute(ctx, next);
            }
        } else {
            next();
        }
    }
}

export class RouteDesignRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (ctx.has(CTX_CURR_SCOPE) && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_CURR_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionInjector).get(scopeType).execute(ctx, next);
            }
        } else {
            next();
        }
    }
}

