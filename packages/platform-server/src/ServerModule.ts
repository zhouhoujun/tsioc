import { Inject, IocExt } from '@tsdi/ioc';
import { ContainerToken, IContainer, ModuleLoader } from '@tsdi/core';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * server module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class ServerModule
 */
@IocExt()
export class ServerModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {
        container.registerValue(ModuleLoader, new NodeModuleLoader(), NodeModuleLoader);
    }
}
