import { Inject, IocExt, Injector, ProviderType, TARGET } from '@tsdi/ioc';
import { ConfigureManagerImpl, ConfigureMergerImpl } from './configure/manager';
import { BaseTypeParser } from './services/parser';
import { BootLifeScope } from './appl/lifescope';
import { ApplicationFactory, ModuleFactory, RunnableFactoryResolver } from './Context';
import { DefaultModuleFactory } from './modules/injector';
import { DefaultApplicationFactory } from './appl/ctx';
import { DefaultServiceFactoryResolver } from './services/fac';


export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: RunnableFactoryResolver, useValue: new DefaultServiceFactoryResolver() },
    { provide: ModuleFactory, useClass: DefaultModuleFactory, deps: [TARGET] },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() }
]

/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class CoreModule
 */
@IocExt()
export class CoreModule {
    /**
     * register core module.
     */
    setup(@Inject() injector: Injector) {
        injector.action().regAction(BootLifeScope);
        injector.register(ConfigureManagerImpl, ConfigureMergerImpl, BaseTypeParser);
    }
}
