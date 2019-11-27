import {
    BindProviderAction, IocSetCacheAction, DecoratorScopes, RegisterSingletionAction,
    Inject, ActionRegisterer, DecoratorProvider, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import { IContainer, IocExt, ContainerToken } from '@tsdi/core';
import {
    HandleRegisterer, ResolveMoudleScope, BootTargetAccessor, AnnoationDesignAction,
    AnnotationCloner, BootLifeScope, ModuleBuildScope, RunnableBuildLifeScope
} from '@tsdi/boot';
import { Component, Input, Output, RefChild, Vaildate } from './decorators';
import { SelectorManager } from './SelectorManager';
import { ComponentManager } from './ComponentManager';
import { ComponentRegisterAction, BindingPropertyTypeAction, BindingCache, BindingCacheFactory, RegisterVaildateAction } from './registers';
import {
    BindingPropertyHandle, ModuleAfterInitHandle, ResolveTemplateScope, ValifyTeamplateHandle,
    BindingTemplateHandle, ModuleAfterContentInitHandle, ModuleBeforeInitHandle, BindingOutputHandle, BootTemplateHandle
} from './resovers';
import { BindingScope, TemplateParseScope } from './parses';
import { ComponentBuilder } from './ComponentBuilder';
import { BootComponentAccessor } from './BootComponentAccessor';
import { ComponentAnnotationCloner } from './ComponentAnnotationCloner';
import { AstResolver } from './AstResolver';


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
            .register(BootComponentAccessor)
            .register(ComponentAnnotationCloner)
            .register(AstResolver);

        container.getInstance(ActionRegisterer)
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
                { provide: BootTargetAccessor, useClass: BootComponentAccessor },
                { provide: AnnotationCloner, useClass: ComponentAnnotationCloner });

        let hdregr = container.getInstance(HandleRegisterer);
        hdregr.register(container, BindingScope, true)
            .register(container, TemplateParseScope, true)
            .get(ResolveMoudleScope)
            .use(ModuleBeforeInitHandle)
            .use(BindingPropertyHandle)
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
