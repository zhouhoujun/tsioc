import { Inject, IocExt, Injector, ProviderType } from '@tsdi/ioc';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BootLifeScope } from './appl/lifescope';
import { ApplicationFactory, BootFactory, ModuleFactory } from './Context';
import { RunnableBootFactory } from './runnable/ctx';
import { DefaultModuleFactory } from './modules/injector';
import { DefaultApplicationFactory } from './appl/ctx';


export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: BootFactory, useValue: new RunnableBootFactory() },
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
    setup(@Inject() injector: Injector) {

        injector.action().regAction(
            // StartupServiceScope,
            BootLifeScope);

        injector.use(ConfigureMerger, ConfigureManager, BaseTypeParser);

    }
}
