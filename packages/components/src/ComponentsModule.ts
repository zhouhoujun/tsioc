import { IContainer, IocExt, ContainerToken } from '@tsdi/core';
import {
    BindProviderAction, IocSetCacheAction, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction, Inject
} from '@tsdi/ioc';
import { Component, Input } from './decorators';
import { SelectorManager } from './SelectorManager';
import { ComponentManager } from './ComponentManager';
import { ComponentRegisterAction, BindingPropertyTypeAction, BindingParamTypeAction } from './registers';
import { BuildHandleRegisterer, ResolveMoudleScope, ResolveModuleHandle } from '@tsdi/boot';
import { BindingArgsHandle } from './resovers/BindingArgsHandle';
import {
    BindingPropertyHandle, ModuleAfterInitHandle, ResolveTemplateScope,
    BindingTemplateHandle, ModuleAfterContentInitHandle, ValidComponentRegisterer, BindingComponentRegisterer
} from './resovers';
import { BindingScope, TemplateParseScope } from './parses';
import { ComponentDecoratorService } from './ComponentDecoratorService';
import { ComponentContextScope } from './ComponentContextScope';


/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@IocExt('setup')
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {

        container.register(SelectorManager)
            .register(ComponentManager)
            .register(ComponentContextScope)
            .register(ComponentDecoratorService);

        container.getActionRegisterer()
            .register(container, ComponentRegisterAction)
            .register(container, BindingPropertyTypeAction)
            .register(container, BindingParamTypeAction);

        if (!container.has(ValidComponentRegisterer)) {
            container.register(ValidComponentRegisterer);
        }
        if (!container.has(BindingComponentRegisterer)) {
            container.register(BindingComponentRegisterer);
        }

        container.get(BuildHandleRegisterer)
            .register(container, BindingScope, true)
            .register(container, TemplateParseScope, true)
            .get(ResolveMoudleScope)
            .useBefore(BindingArgsHandle, ResolveModuleHandle)
            .use(BindingPropertyHandle)
            .use(ModuleAfterInitHandle)
            .use(ResolveTemplateScope)
            .use(BindingTemplateHandle)
            .use(ModuleAfterContentInitHandle);

        container.get(DesignDecoratorRegisterer)
            .register(Component, DecoratorScopes.Class, BindProviderAction, ComponentRegisterAction)
            .register(Input, DecoratorScopes.Property, BindingPropertyTypeAction);

        container.get(RuntimeDecoratorRegisterer)
            .register(Component, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Input, DecoratorScopes.Parameter, BindingParamTypeAction);
    }

}
