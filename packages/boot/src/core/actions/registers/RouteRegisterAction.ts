import {
    Singleton, Inject, IocDesignAction, IocRuntimeAction,
    RuntimeActionContext, DesignActionContext
} from '@ts-ioc/ioc';
import { IContainer, ContainerToken } from '@ts-ioc/core';
import { ContainerPoolToken } from '../../ContainerPool';

@Singleton
export class RouteRuntimRegisterAction extends IocRuntimeAction {
    protected container: IContainer;
    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }
    execute(ctx: RuntimeActionContext, next: () => void): void {
        // let pool = this.container.get(ContainerPoolToken);
        // let parent = pool.getParent(this.container);
        // while (parent) {
        //     parent.get(RuntimeLifeScope).register(ctx);
        //     parent = pool.getParent(parent);
        // }
    }
}

@Singleton
export class RouteDesignRegisterAction extends IocDesignAction {
    protected container: IContainer;
    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }
    execute(ctx: DesignActionContext, next: () => void): void {
        // let pool = this.container.get(ContainerPoolToken);
        // let parent = pool.getParent(this.container);
        // while (parent) {
        //     parent.get(DesignLifeScope).register(ctx);
        //     parent = pool.getParent(parent);
        // }
    }
}

