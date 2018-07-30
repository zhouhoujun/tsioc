import { IContainer, Inject, ContainerToken, LifeScopeToken, IocExt, CoreActions } from '@ts-ioc/core';
import { DIModule, Bootstrap } from './decorators';
import { ModuleBuilder } from './ModuleBuilder';
import { DefaultApplicationBuilder } from './ApplicationBuilder';
import { BootstrapBuilder } from './BootstrapBuilder';

/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootstrapModule
 */
@IocExt('setup')
export class BootstrapModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;

        let lifeScope = container.get(LifeScopeToken);

        lifeScope.registerDecorator(DIModule, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
        lifeScope.registerDecorator(Bootstrap, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);

        container.register(ModuleBuilder);
        container.register(BootstrapBuilder);
        container.register(DefaultApplicationBuilder);

    }
}
