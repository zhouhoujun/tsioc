import 'core-js';
import { IocExt, Inject, ModuleLoader, ROOT_INJECTOR, Injector } from '@tsdi/ioc';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * browser module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 */
@IocExt()
export class BrowserModule {

    /**
     * register aop for container.
     */
    setup(@Inject(ROOT_INJECTOR) injector: Injector) {
        injector.setValue(ModuleLoader, new BrowserModuleLoader(), BrowserModuleLoader);
    }
}
