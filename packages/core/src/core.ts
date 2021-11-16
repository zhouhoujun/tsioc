import { Inject, IocExt, Injector, ProviderType } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { BootLifeScope } from './app/lifescope';
import { ApplicationFactory } from './Context';
import { DefaultApplicationFactory } from './app/ctx';
import { DefaultModuleFactoryResolver } from './module/module';
import { ModuleFactoryResolver } from './module.factory';


export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() },
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
