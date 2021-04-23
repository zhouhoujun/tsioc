import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BootContext } from './boot/ctx';
import { BootLifeScope, RunnableBuildLifeScope, StartupServiceScope } from './boot/lifescope';
import { BuilderService } from './services/BuilderService';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt()
export class BootModule {

    constructor() { }

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {

        container.action().regAction(
            StartupServiceScope,
            RunnableBuildLifeScope,
            BootLifeScope);

        container.use(BootContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser);

    }
}
