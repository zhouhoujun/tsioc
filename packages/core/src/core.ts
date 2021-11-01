import { Inject, IocExt, Injector, ProviderType, TARGET } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { BootLifeScope } from './appfac/lifescope';
import { ApplicationFactory } from './Context';
import { DefaultModuleFactory } from './modules/injector';
import { DefaultApplicationFactory } from './appfac/ctx';
import { DefaultServiceFactoryResolver } from './services/factory';
import { RunnableFactoryResolver } from './runnable';
import { ModuleFactory } from './module';


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
        injector.register(DefaultConfigureManager, ConfigureMergerImpl);
    }
}
