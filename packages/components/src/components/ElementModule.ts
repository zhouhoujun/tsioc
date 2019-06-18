import { IocExt, ContainerToken, IContainer } from '@tsdi/core';
import { Inject } from '@tsdi/ioc';
import { Component } from '../decorators';
import { ComponentSelectorHandle, ValidComponentHandle, BindingComponentHandle } from './handles';
import { ElementDecoratorRegisterer } from '../parses';
import { ValidComponentRegisterer, BindingComponentRegisterer } from '../resovers';
import { Element } from './Element';
import { ContentElement } from './ContentElement';
import { BuildHandleRegisterer, RegisterFor, RegFor } from '@tsdi/boot';

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
        container.get(ElementDecoratorRegisterer).register(Component, ComponentSelectorHandle);
        container.get(ValidComponentRegisterer).register(Component, ValidComponentHandle);
        container.get(BindingComponentRegisterer).register(Component, BindingComponentHandle);

        container.get(BuildHandleRegisterer)
            .register(container, ComponentSelectorHandle)
            .register(container, ValidComponentHandle)
            .register(container, BindingComponentHandle);

        container.register(Element);
        container.register(ContentElement);
    }
}
