import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { ResolveMoudleScope } from './builder/handles';
import { BootContext } from './boot/ctx';
import { RunnableBuildLifeScope, BootLifeScope, StartupServiceScope } from './boot/lifescope';


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

        const prdr = container.provider;
        prdr.regAction(
            ResolveMoudleScope,
            StartupServiceScope,
            RunnableBuildLifeScope,
            BootLifeScope);

        container.use(BootContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser);


    }
}
