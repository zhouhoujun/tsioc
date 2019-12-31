import 'core-js';
import { IocExt, Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer, ModuleLoader } from '@tsdi/core';
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
    setup(@Inject(ContainerToken) container: IContainer) {
        container.registerValue(ModuleLoader,  new BrowserModuleLoader(), BrowserModuleLoader);
    }
}
