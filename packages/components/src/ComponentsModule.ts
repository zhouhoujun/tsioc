import {
    BindAnnoPdrAction, IocSetCacheAction, RegSingletionAction,
    Inject, DecoratorProvider, DesignRegisterer, RuntimeRegisterer, IocExt, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { ResolveMoudleScope, AnnoationDesignAction, AnnotationCloner, BuildContext } from '@tsdi/boot';
import { Input } from './decorators/Input';
import { Output } from './decorators/Output';
import { RefChild } from './decorators/RefChild';
import { Component } from './decorators/Component';
import { Directive } from './decorators/Directive';
import { Vaildate } from './decorators/Vaildate';
import { Pipe } from './decorators/Pipe';
import { BindingScope } from './compile/binding-comp';
import { TemplateParseScope } from './compile/parse-templ';
import { ComponentBuilder } from './ComponentBuilder';
import { ComponentAnnotationCloner } from './ComponentAnnotationCloner';

import { ComponentRegAction, DirectiveRegisterAction } from './registers/ComponentRegAction';
import { BindingPropTypeAction } from './registers/BindingPropTypeAction';
import { BindingsCache } from './registers/BindingsCache';
import { RegVaildateAction } from './registers/RegVaildateAction';
import { PipeRegAction } from './registers/PipeRegAction';
import { BindingComponentScope, ParseTemplateHandle  } from './compile/build-comp';

import { DefaultComponets } from './IComponentReflect';
import { ComponentProvider, AstResolver } from './ComponentProvider';
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


        const cls: DecoratorScope = 'Class';
        const prty: DecoratorScope = 'Property';

        actInjector.getInstance(DesignRegisterer)
            .register(Component, cls, BindAnnoPdrAction, AnnoationDesignAction, ComponentRegAction)
            .register(Directive, cls, BindAnnoPdrAction, AnnoationDesignAction, DirectiveRegisterAction)
            .register(Pipe, cls, BindAnnoPdrAction, PipeRegAction)
            .register(Input, prty, BindingPropTypeAction)
            .register(Output, prty, BindingPropTypeAction)
            .register(RefChild, prty, BindingPropTypeAction)
            .register(Vaildate, prty, RegVaildateAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Component, cls, RegSingletionAction, IocSetCacheAction)
            .register(Directive, cls, RegSingletionAction, IocSetCacheAction);

        container.registerType(ComponentBuilder);
    }

}
