import { Inject, IocExt, Injector, ModuleLoader, ROOT_INJECTOR } from '@tsdi/ioc';
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
    setup(@Inject(ROOT_INJECTOR) injector: Injector) {
        injector.setValue(ModuleLoader, new NodeModuleLoader(), NodeModuleLoader);
    }
}
