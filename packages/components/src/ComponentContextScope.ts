import { ContextScope, BootContext } from '@tsdi/boot';
import { IContainer } from '@tsdi/core';
import { ComponentManager } from './ComponentManager';

export class ComponentContextScope extends ContextScope {

    getScopes(container: IContainer, scope: any) {
        return container.get(ComponentManager).getScopes(scope);
    }

    getBoot(ctx: BootContext) {
        let mgr = ctx.getRaiseContainer().get(ComponentManager);
        if (ctx.bootstrap && mgr.hasContent(ctx.bootstrap)) {
            return mgr.getLeaf(ctx.bootstrap);
        }
        if (ctx.target && mgr.hasContent(ctx.target)) {
            return mgr.getLeaf(ctx.target);
        }
        return ctx.bootstrap || ctx.target;
    }
}
