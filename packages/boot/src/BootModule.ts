import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { MessageContext } from './middlewares/ctx';
import { MessageQueue, RootMessageQueue } from './middlewares/queue';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { ResolveMoudleScope } from './builder/handles';
import { RunnableBuildLifeScope, BootLifeScope, StartupServiceScope } from './boot/lifescope';
import { BuildContext } from './builder/ctx';
import { BootContext } from './boot/ctx';


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

        container.inject(BuildContext, BootContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);

    }
}
