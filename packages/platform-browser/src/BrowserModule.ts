import 'core-js';
import { IocExt, Inject } from '@tsdi/ioc';
import { CONTAINER, IContainer, MODULE_LOADER } from '@tsdi/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * browser module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 */
@IocExt()
export class BrowserModule {

    constructor() { }

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        container.setValue(MODULE_LOADER, new BrowserModuleLoader(), BrowserModuleLoader);
    }
}
