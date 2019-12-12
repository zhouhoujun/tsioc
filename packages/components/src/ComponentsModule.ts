import {
    BindProviderAction, IocSetCacheAction, DecoratorScopes, RegisterSingletionAction,
    Inject, ActionInjector, DecoratorProvider, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import { IContainer, IocExt, ContainerToken } from '@tsdi/core';
import {
    HandleRegisterer, ResolveMoudleScope, AnnoationDesignAction, AnnotationCloner,
    BootLifeScope, ModuleBuildScope, RunnableBuildLifeScope, RootContainerToken
} from '@tsdi/boot';
import { SelectorManager } from './SelectorManager';
import { Input } from './decorators/Input';
import { Output } from './decorators/Output';
import { RefChild } from './decorators/RefChild';
import { Component } from './decorators/Component';
import { Vaildate } from './decorators/Vaildate';
import { BindingScope } from './parses/BindingScope';
import { TemplateParseScope } from './parses/TemplateParseScope';
import { ComponentBuilder } from './ComponentBuilder';
import { ComponentAnnotationCloner } from './ComponentAnnotationCloner';
import { AstResolver } from './AstResolver';
import { APP_COMPONENT_REFS } from './ComponentRef';

import { ComponentRegisterAction } from './registers/ComponentRegisterAction';
import { BindingPropertyTypeAction } from './registers/BindingPropertyTypeAction';
import { BindingCache, BindingCacheFactory } from './registers/BindingCache';
import { RegisterVaildateAction } from './registers/RegisterVaildateAction';

import { ModuleBeforeInitHandle } from './resolvers/ModuleBeforeInitHandle';
import { BindingPropertyHandle } from './resolvers/BindingPropertyHandle';
import { ModuleAfterInitHandle } from './resolvers/ModuleAfterInitHandle';
import { ResolveTemplateScope } from './resolvers/ResolveTemplateScope';
import { ValifyTeamplateHandle } from './resolvers/ValifyTeamplateHandle';
import { BindingTemplateHandle } from './resolvers/BindingTemplateHandle';
import { ModuleAfterContentInitHandle } from './resolvers/ModuleAfterContentInitHandle';
import { BindingOutputHandle } from './resolvers/BindingOutputHandle';
import { BootTemplateHandle } from './resolvers/BootTemplateHandle';
import { ComponentManager } from './ComponentManager';
import { ModuleInitHandle } from './resolvers/ModuleInitHandle';

/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@IocExt('setup')
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {

        container.inject(ComponentManager, SelectorManager, ComponentAnnotationCloner, AstResolver);

        container.get(RootContainerToken).bindProvider(APP_COMPONENT_REFS, new WeakMap());
        container.getInstance(ActionInjector)
            .register(container, ComponentRegisterAction)
            .register(container, BindingPropertyTypeAction);

        container.getInstance(DecoratorProvider)
            .bindProviders(Input, {
                provide: BindingCache,
                useFactory: () => new BindingCacheFactory(ref => {
                    if (!ref.propInBindings) {
                        ref.propInBindings = new Map();
                    }
                    return ref.propInBindings;
                })
            })
            .bindProviders(Output, {
                provide: BindingCache,
                useFactory: () => new BindingCacheFactory(ref => {
                    if (!ref.propOutBindings) {
                        ref.propOutBindings = new Map();
                    }
                    return ref.propOutBindings;
                })
            })
            .bindProviders(RefChild, {
                provide: BindingCache,
                useFactory: () => new BindingCacheFactory(ref => {
                    if (!ref.propRefChildBindings) {
                        ref.propRefChildBindings = new Map();
                    }
                    return ref.propRefChildBindings;
                })
            })
            .bindProviders(Component,
                { provide: AnnotationCloner, useClass: ComponentAnnotationCloner });

        let hdregr = container.getInstance(HandleRegisterer);
        hdregr.register(container, BindingScope, true)
            .register(container, TemplateParseScope, true)
            .get(ResolveMoudleScope)
            .use(ModuleBeforeInitHandle)
            .use(BindingPropertyHandle)
            .use(ModuleInitHandle)
            .use(ModuleAfterInitHandle)
            .use(ResolveTemplateScope)
            .use(ValifyTeamplateHandle)
            .use(BindingTemplateHandle)
            .use(BindingOutputHandle)
            .use(ModuleAfterContentInitHandle);

        hdregr.get(BootLifeScope)
            .useBefore(BootTemplateHandle, ModuleBuildScope);
        hdregr.get(RunnableBuildLifeScope)
            .useBefore(BootTemplateHandle, ModuleBuildScope);


        container.getInstance(DesignRegisterer)
            .register(Component, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction)
            .register(Input, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Output, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(RefChild, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Vaildate, DecoratorScopes.Property, RegisterVaildateAction);

        container.getInstance(RuntimeRegisterer)
            .register(Component, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.register(ComponentBuilder);
    }

}
