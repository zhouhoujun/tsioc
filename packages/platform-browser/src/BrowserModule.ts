import 'core-js';
import { IocExt, ContainerToken, IContainer, ContainerBuilderToken, ModuleLoader } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import { Inject } from '@ts-ioc/ioc';


/**
 * browser module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BrowserModule
 */
@IocExt('setup')
export class BrowserModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        container.bindProvider(ModuleLoader,  new BrowserModuleLoader());
    }
}
