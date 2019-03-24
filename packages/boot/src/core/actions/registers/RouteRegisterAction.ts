import {
    Singleton, Inject, IocDesignAction, IocRuntimeAction,
    RuntimeActionContext, DesignActionContext, lang, IocCompositeAction, Type
} from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../../ContainerPool';

@Singleton
export class RouteRuntimRegisterAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (this.container !== ctx.getRaiseContainer()) {
            return next();
        }
        if (ctx.currScope) {
            let container = this.container;
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let pool = container.get(ContainerPoolToken);
            let parent = pool.getParent(container);
            while (parent) {
                parent.get(scopeType).execBody(ctx);
                parent = pool.getParent(parent);
                console.log(!!parent, scopeType);
            }
        }
        next();
    }
}

@Singleton
export class RouteDesignRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (this.container !== ctx.getRaiseContainer()) {
            return next();
        }
        if (ctx.currScope) {
            let container = this.container;
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let pool = container.get(ContainerPoolToken);
            let parent = pool.getParent(container);
            while (parent) {
                parent.get(scopeType).execBody(ctx);
                parent = pool.getParent(parent);
                console.log(!!parent, scopeType);
            }
        }
        next();
    }
}

