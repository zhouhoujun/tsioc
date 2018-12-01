import 'core-js';
import { IocExt, Inject, ContainerToken, IContainer, ModuleLoaderToken, ContainerBuilderToken } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import { BrowserContainerBuilder } from './ContainerBuilder';

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
        container.bindProvider(ModuleLoaderToken, new BrowserModuleLoader());
        container.bindProvider(ContainerBuilderToken, new BrowserContainerBuilder());
    }
}
