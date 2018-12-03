import 'core-js';
import { IocExt, Inject, ContainerToken, IContainer, ModuleLoaderToken, ContainerBuilderToken, isUndefined } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import { BrowserContainerBuilder } from './ContainerBuilder';
import { ProcessRunRootToken } from '@ts-ioc/bootstrap';
declare let System: any;

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
        let base = !isUndefined(System) ? System.baseURL : '.';
        container.bindProvider(ProcessRunRootToken, () => base);
        container.bindProvider(ModuleLoaderToken, new BrowserModuleLoader());
        container.bindProvider(ContainerBuilderToken, new BrowserContainerBuilder());
    }
}
