import {
    BindProviderAction, IocSetCacheAction, DecoratorScopes, RegisterSingletionAction,
    Inject, DecoratorProvider, DesignRegisterer, RuntimeRegisterer, IocExt
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { ResolveMoudleScope, AnnoationDesignAction, AnnotationCloner, BuildContext } from '@tsdi/boot';
import { Input } from './decorators/Input';
import { Output } from './decorators/Output';
import { RefChild } from './decorators/RefChild';
import { Component } from './decorators/Component';
import { Vaildate } from './decorators/Vaildate';
import { Pipe } from './decorators/Pipe';
import { BindingScope } from './parses/BindingScope';
import { TemplateParseScope } from './parses/TemplateParseScope';
import { ComponentBuilder } from './ComponentBuilder';
import { ComponentAnnotationCloner } from './ComponentAnnotationCloner';
import { AstResolver } from './AstResolver';

import { ComponentRegisterAction } from './registers/ComponentRegisterAction';
import { BindingPropertyTypeAction } from './registers/BindingPropertyTypeAction';
import { BindingsCache } from './registers/BindingsCache';
import { RegisterVaildateAction } from './registers/RegisterVaildateAction';
import { PipeRegisterAction } from './registers/PipeRegisterAction';
import { BindingComponentScope } from './resolvers/BindingComponentScope';
import { ParseTemplateHandle } from './resolvers/ParseTemplateHandle';
import { DefaultComponets } from './IComponentReflect';
import { ComponentProvider } from './ComponentProvider';
import { TEMPLATE_REF, TemplateRef, COMPONENT_REF, ComponentRef, ELEMENT_REF, ElementRef } from './ComponentRef';
import { ComponentContext } from './ComponentContext';


/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {
        container.registerType(ComponentAnnotationCloner);
        let actInjector = container.getActionInjector();

        actInjector.setValue(DefaultComponets, ['@Component']);
        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Component,
                {
                    provide: BindingsCache,
                    useFactory: () => new BindingsCache()
                        .register(Input)
                        .register(Output)
                        .register(RefChild)
                        .register(Vaildate)
                },
                { provide: BuildContext, useClass: ComponentContext },
                { provide: AnnotationCloner, useClass: ComponentAnnotationCloner },
                { provide: ELEMENT_REF, useClass: ElementRef },
                { provide: TEMPLATE_REF, useClass: TemplateRef },
                { provide: COMPONENT_REF, useClass: ComponentRef },
                { provide: AstResolver, useFactory: (prd) => new AstResolver(prd), deps: [ComponentProvider] }
            );

        actInjector.regAction(BindingScope)
            .regAction(TemplateParseScope)
            .getInstance(ResolveMoudleScope)
            .use(BindingComponentScope)
            .use(ParseTemplateHandle);



        actInjector.getInstance(DesignRegisterer)
            .register(Component, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction)
            .register(Pipe, DecoratorScopes.Class, BindProviderAction, PipeRegisterAction)
            .register(Input, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Output, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(RefChild, DecoratorScopes.Property, BindingPropertyTypeAction)
            .register(Vaildate, DecoratorScopes.Property, RegisterVaildateAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Component, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.registerType(ComponentBuilder);
    }

}
