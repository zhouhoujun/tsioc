import { Inject, DecoratorProvider, ActionInjectorToken, IocExt } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { Component } from '../decorators/Component';
import { ElementNode } from './ElementNode';
import { ComponentProvider } from '../ComponentProvider';
import { ElementProvider } from './ElementProvider';
import { ComponentSelectorHandle } from './handles/ComponentSelectorHandle';

/**
 * component element module.
 *
 * @export
 * @class ElementModule
 */
@IocExt()
export class ElementModule {

    constructor() {

    }

    setup(@Inject(ContainerToken) container: IContainer) {

        let actInjector = container.get(ActionInjectorToken)
        actInjector.getInstance(StartupDecoratorRegisterer)
            .register(Component, StartupScopes.TranslateTemplate, ComponentSelectorHandle);

        actInjector.regAction(ComponentSelectorHandle);

        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Component, { provide: ComponentProvider, useClass: ElementProvider })

        container.registerType(ElementNode);
    }
}
