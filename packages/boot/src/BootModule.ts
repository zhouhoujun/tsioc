import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BootLifeScope } from './appl/lifescope';

import { DefaultBootFactory } from './runnable/ctx';
import { DefaultModuleFactory } from './modules/ctx';
import { DefaultApplicationFactory } from './appl/ctx';
import { ApplicationFactory, BootFactory, ModuleFactory } from './Context';


export const DEFAULTA_FACTORYS = [
    { provide: BootFactory, useValue: new DefaultBootFactory() },
    { provide: ModuleFactory, useValue: new DefaultModuleFactory() },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() }
]

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
            // StartupServiceScope,
            BootLifeScope);

        container.use(ConfigureMerger, ConfigureManager, BaseTypeParser);
        container.parse(DEFAULTA_FACTORYS);

    }
}
