import { IContainer, ContainerToken, IocExt, ServiceDecoratorRegisterer, ModuleDecoratorRegisterer } from '@tsdi/core';
import { Pack } from './decorators';
import { BindProviderAction, Inject, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { TaskDecoratorServiceAction, ActivityBuildHandle, RegSelectorAction } from '@tsdi/activities';
import { ModuleBuildDecoratorRegisterer, DIModuleRegisterScope } from '@tsdi/boot';

/**
 * pack setup.
 *
 * @export
 * @class PackSetup
 */
@IocExt('setup')
export class PackSetup {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    setup() {
        this.registerDecorator(Pack);
    }

    protected registerDecorator(decor: Function | string) {
        this.container.get(DesignDecoratorRegisterer).register(decor, DecoratorScopes.Class, BindProviderAction, RegSelectorAction);
        this.container.get(ModuleDecoratorRegisterer).register(decor, DIModuleRegisterScope);
        this.container.get(ModuleBuildDecoratorRegisterer).register(decor, ActivityBuildHandle);
        this.container.get(ServiceDecoratorRegisterer).register(decor, TaskDecoratorServiceAction);
    }
}
