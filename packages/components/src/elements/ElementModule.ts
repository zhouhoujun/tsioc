import { Inject, DecoratorProvider, ActionInjectorToken } from '@tsdi/ioc';
import { IocExt, ContainerToken, IContainer } from '@tsdi/core';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { Component } from '../decorators/Component';
import { ElementNode } from './ElementNode';
import { RefSelector } from '../RefSelector';
import { RefElementSelector } from './RefElementSelector';
import { ComponentSelectorHandle } from './handles/ComponentSelectorHandle';
import { ValidComponentHandle } from './handles/ValidComponentHandle';
import { BindingComponentHandle } from './handles/BindingComponentHandle';

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
        ;
        container.register(RefElementSelector);

        let actInjector = container.get(ActionInjectorToken)
        actInjector.getInstance(StartupDecoratorRegisterer)
            .register(Component, StartupScopes.TranslateTemplate, ComponentSelectorHandle)
            .register(Component, StartupScopes.ValifyComponent, ValidComponentHandle)
            .register(Component, StartupScopes.Binding, BindingComponentHandle);

        actInjector.register(ComponentSelectorHandle)
            .register(ValidComponentHandle)
            .register(BindingComponentHandle);

        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Component, { provide: RefSelector, useClass: RefElementSelector })

        container.register(ElementNode);
    }
}
