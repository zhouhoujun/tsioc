import {
    BindProviderAction, IocSetCacheAction, DecoratorScopes, RegisterSingletionAction,
    Inject, DecoratorProvider, DesignRegisterer, RuntimeRegisterer, ActionInjectorToken, IocExt
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import {
    ResolveMoudleScope, AnnoationDesignAction, AnnotationCloner,
    BootLifeScope, ModuleBuildScope, RunnableBuildLifeScope
} from '@tsdi/boot';
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

import { ComponentRegisterAction } from './registers/ComponentRegisterAction';
import { BindingPropertyTypeAction } from './registers/BindingPropertyTypeAction';
import { BindingCache, BindingCacheFactory } from './registers/BindingCache';
import { RegisterVaildateAction } from './registers/RegisterVaildateAction';

import { ModuleBeforeInitHandle } from './resolvers/ModuleBeforeInitHandle';
import { BindingPropertyHandle } from './resolvers/BindingPropertyHandle';
import { ModuleAfterInitHandle } from './resolvers/ModuleAfterInitHandle';
import { ResolveTemplateScope } from './resolvers/ResolveTemplateScope';
import { ValifyTeamplateHandle } from './resolvers/ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './resolvers/BindingTemplateRefHandle';
import { ModuleAfterContentInitHandle } from './resolvers/ModuleAfterContentInitHandle';
import { BindingOutputHandle } from './resolvers/BindingOutputHandle';
import { BootTemplateHandle } from './resolvers/BootTemplateHandle';
import { ModuleInitHandle } from './resolvers/ModuleInitHandle';
import { DefaultComponentFactory } from './ComponentRef';

/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {
        container.registerType(DefaultComponentFactory)
            .registerType(ComponentAnnotationCloner)
            .registerType(AstResolver);
        let actInjector = container.get(ActionInjectorToken);

        actInjector.regAction(ComponentRegisterAction)
            .regAction(BindingPropertyTypeAction);

        actInjector.getInstance(DecoratorProvider)
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

        actInjector.regAction(BindingScope)
            .regAction(TemplateParseScope)
            .get(ResolveMoudleScope)
            .use(ModuleBeforeInitHandle)
            .use(BindingPropertyHandle)
            .use(ModuleInitHandle)
            .use(ModuleAfterInitHandle)
            .use(ResolveTemplateScope)
            .use(ValifyTeamplateHandle)
            .use(BindingTemplateRefHandle)
            .use(BindingOutputHandle)
            .use(ModuleAfterContentInitHandle);

        actInjector.getInstance(BootLifeScope)
            .useBefore(BootTemplateHandle, ModuleBuildScope);
        actInjector.getInstance(RunnableBuildLifeScope)
            .useBefore(BootTemplateHandle, ModuleBuildScope);


        actInjector.getInstance(DesignRegisterer)
            .register(Component, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction)
            .register(Input, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Output, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(RefChild, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Vaildate, DecoratorScopes.Property, RegisterVaildateAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Component, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.registerType(ComponentBuilder);
    }

}
