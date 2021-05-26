import { Inject, IocExt, CONTAINER, IContainer, MODULE_LOADER  } from '@tsdi/ioc';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * server module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 */
@IocExt()
export class ServerModule {

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        container.setValue(MODULE_LOADER, new NodeModuleLoader(), NodeModuleLoader);
    }
}
