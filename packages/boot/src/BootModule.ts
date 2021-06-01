import { Inject, IocExt, Injector, ProviderType, TARGET } from '@tsdi/ioc';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/parser';
import { BootLifeScope } from './appl/lifescope';
import { ApplicationFactory, ModuleFactory, ServiceFactoryResolver } from './Context';
import { DefaultModuleFactory } from './modules/injector';
import { DefaultApplicationFactory } from './appl/ctx';
import { DefaultServiceFactoryResolver } from './services/fac';


export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: ServiceFactoryResolver, useValue: new DefaultServiceFactoryResolver() },
    { provide: ModuleFactory, useFactory: (type) => new DefaultModuleFactory(type), deps: [TARGET] },
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

    /**
     * register aop for container.
     */
    setup(@Inject() injector: Injector) {

        injector.action().regAction(BootLifeScope);
        injector.register(ConfigureMerger, ConfigureManager, BaseTypeParser);

    }
}
