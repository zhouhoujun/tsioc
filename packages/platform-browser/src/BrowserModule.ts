import 'core-js';
import { IocExt, Inject, CONTAINER, Container, ModuleLoader } from '@tsdi/ioc';
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
    setup(@Inject(CONTAINER) container: Container) {
        container.setValue(ModuleLoader, new BrowserModuleLoader(), BrowserModuleLoader);
    }
}
