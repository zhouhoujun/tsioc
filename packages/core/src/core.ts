import { Inject, IocExt, Injector, ProviderType, TARGET, DEFAULTA_MODULE_FACTORYS } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { BootLifeScope } from './appfac/lifescope';
import { ApplicationFactory } from './Context';
import { DefaultApplicationFactory } from './appfac/ctx';
import { DefaultServiceFactoryResolver } from './services/factory';
import { RunnableFactoryResolver } from './runnable';


export const DEFAULTA_FACTORYS: ProviderType[] = [
    ...DEFAULTA_MODULE_FACTORYS,
    { provide: RunnableFactoryResolver, useValue: new DefaultServiceFactoryResolver() },
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
        injector.platform().registerAction(BootLifeScope);
        injector.register(DefaultConfigureManager, ConfigureMergerImpl);
    }
}
