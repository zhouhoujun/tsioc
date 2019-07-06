import { ContextScope, BootContext, ContextScopeToken } from '@tsdi/boot';
import { IContainer } from '@tsdi/core';
import { ComponentManager } from './ComponentManager';
import { Singleton } from '@tsdi/ioc';

@Singleton(ContextScopeToken)
export class ComponentContextScope extends ContextScope {

    getScopes(container: IContainer, scope: any) {
        return container.resolve(ComponentManager).getScopes(scope);
    }

    getBootTarget(ctx: BootContext) {
        let mgr = ctx.getRaiseContainer().resolve(ComponentManager);
        if (ctx.bootstrap && mgr.hasComposite(ctx.bootstrap)) {
            return mgr.getLeaf(ctx.bootstrap);
        }
        if (ctx.target && mgr.hasComposite(ctx.target)) {
            return mgr.getLeaf(ctx.target);
        }
        return ctx.bootstrap || ctx.target;
    }
}
