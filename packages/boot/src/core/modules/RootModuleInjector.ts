import { Singleton, Type } from '@tsdi/ioc';
import { ModuleInjector, IContainer } from '@tsdi/core';
import { ContainerPoolToken } from '../ContainerPool';


@Singleton
export class RootModuleInjector extends ModuleInjector {
    getDecorator(): string {
        return '@RootModule';
    }

    protected async setup(container: IContainer, type: Type<any>) {
        container.get(ContainerPoolToken).getRoot().register(type);
    }

    protected syncSetup(container: IContainer, type: Type<any>) {
        container.get(ContainerPoolToken).getRoot().register(type);
    }
}
