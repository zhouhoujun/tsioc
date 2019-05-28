
import { IocExt, ContainerToken, IContainer } from '@tsdi/core';
import { Inject } from '@tsdi/ioc';
import { ElementDecoratorRegisterer, ValidComponentRegisterer, BindingComponentRegisterer } from '../builder';
import { Component } from '../core';
import { ComponentSelectorHandle, ValidComponentHandle } from './handles';

/**
 * default component extends module.
 *
 * @export
 * @class ComponentModule
 */
@IocExt('setup')
export class ComponentModule {

    constructor() {

    }

    setup(@Inject(ContainerToken) container: IContainer) {
        container.get(ElementDecoratorRegisterer).register(Component, ComponentSelectorHandle);
        container.get(ValidComponentRegisterer).register(Component, ValidComponentHandle);
        container.get(BindingComponentRegisterer).register(Component, ComponentSelectorHandle);
    }
}
