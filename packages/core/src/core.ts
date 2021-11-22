import { Inject, IocExt, Injector, ProviderType } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { BootLifeScope } from './app/lifescope';
import { ApplicationFactory } from './Context';
import { ApplicationShutdownHandlers, isShutdown } from './shutdown';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver } from './module/module';
import { DefaultApplicationFactory } from './app/ctx';


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
        const platform = injector.platform();

        platform.registerAction(BootLifeScope);
        platform.onInstanceCreated((value, inj) => {
            if (isShutdown(value)) {
                inj.get(ApplicationShutdownHandlers)?.add(value);
            }
        });

        injector.register(DefaultConfigureManager, ConfigureMergerImpl);
    }
}
