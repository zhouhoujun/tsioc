import { Inject, IocExt, Container, ModuleLoader } from '@tsdi/ioc';
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
    setup(@Inject() container: Container) {
        container.setValue(ModuleLoader, new NodeModuleLoader(), NodeModuleLoader);
    }
}
