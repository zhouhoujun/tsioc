import { Inject, IocExt } from '@tsdi/ioc';
import { CONTAINER, IContainer, ModuleLoader } from '@tsdi/core';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * server module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class ServerModule
 */
@IocExt()
export class ServerModule {

    constructor() { }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        container.setValue(ModuleLoader, new NodeModuleLoader(), NodeModuleLoader);
    }
}
