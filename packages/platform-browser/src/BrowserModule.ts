import 'core-js';
import { IocExt, Inject, IContainer, CONTAINER, MODULE_LOADER } from '@tsdi/ioc';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * browser module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BrowserModule
 */
@IocExt()
export class BrowserModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        container.setValue(MODULE_LOADER,  new BrowserModuleLoader(container), BrowserModuleLoader);
    }
}
