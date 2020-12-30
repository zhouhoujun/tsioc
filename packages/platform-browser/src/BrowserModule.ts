import 'core-js';
import { IocExt, Inject, IContainer, CONTAINER } from '@tsdi/ioc';
import { ModuleLoader } from '@tsdi/core';
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
        container.setValue(ModuleLoader,  new BrowserModuleLoader(container), BrowserModuleLoader);
    }
}
