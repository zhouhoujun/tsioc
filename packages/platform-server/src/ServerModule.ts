import { CONTAINER, IContainer, Inject, IocExt, MODULE_LOADER } from '@tsdi/ioc';
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
    setup(@Inject(CONTAINER) container: IContainer) {
        container.setValue(MODULE_LOADER, new NodeModuleLoader(container), NodeModuleLoader);
    }
}
