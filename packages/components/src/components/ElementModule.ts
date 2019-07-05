import { IocExt, ContainerToken, IContainer } from '@tsdi/core';
import { Inject } from '@tsdi/ioc';
import { Component } from '../decorators';
import { ComponentSelectorHandle, ValidComponentHandle, BindingComponentHandle } from './handles';
import { Element } from './Element';
import { ContentElement } from './ContentElement';
import { HandleRegisterer, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';

/**
 * component element module.
 *
 * @export
 * @class ElementModule
 */
@IocExt('setup')
export class ElementModule {

    constructor() {

    }

    setup(@Inject(ContainerToken) container: IContainer) {
        container.get(StartupDecoratorRegisterer)
            .register(Component, StartupScopes.Element, ComponentSelectorHandle)
            .register(Component, StartupScopes.ValidComponent, ValidComponentHandle)
            .register(Component, StartupScopes.Binding, BindingComponentHandle);

        container.get(HandleRegisterer)
            .register(container, ComponentSelectorHandle)
            .register(container, ValidComponentHandle)
            .register(container, BindingComponentHandle);

        container.register(Element);
        container.register(ContentElement);
    }
}
