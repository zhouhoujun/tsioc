import {
    Singleton, IocDesignAction, IocRuntimeAction, lang, Type,
    RuntimeActionContext, DesignActionContext, IocCompositeAction
} from '@ts-ioc/ioc';
import { ParentContainerToken } from '../../ContainerPool';

@Singleton
export class RouteRuntimRegisterAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.currScope && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let parent = this.container.get(ParentContainerToken);
            while (parent) {
                parent.get(scopeType).execBody(ctx);
                parent = parent.get(ParentContainerToken);
            }
        }
        next();
    }
}

@Singleton
export class RouteDesignRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (ctx.currScope && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let parent = this.container.get(ParentContainerToken);
            while (parent) {
                parent.get(scopeType).execBody(ctx);
                parent = parent.get(ParentContainerToken);
            }
        }
        next();
    }
}

