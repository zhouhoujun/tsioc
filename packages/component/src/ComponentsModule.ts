import {
    TypeProviderAction, IocSetCacheAction, RegSingletionAction,
    Inject, DecoratorProvider, DesignRegisterer, RuntimeRegisterer, IocExt, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { ResolveMoudleScope, AnnoationAction, BuildContext } from '@tsdi/boot';
import { Input } from './decorators/Input';
import { Output } from './decorators/Output';
import { RefChild } from './decorators/RefChild';
import { Component } from './decorators/Component';
import { Directive } from './decorators/Directive';
import { Vaildate } from './decorators/Vaildate';
import { Pipe } from './decorators/Pipe';

import { BindingPropTypeAction } from './registers/BindingPropTypeAction';
import { RegVaildateAction } from './registers/RegVaildateAction';
import { PipeRegAction } from './registers/PipeRegAction';
import { ComponentContext } from './ComponentContext';
import { DirectiveCompileAction } from './registers/DirectiveCompileAction';
import { ComponentCompileAction } from './registers/ComponentCompileAction';
import { ParseTemplateHandle } from './compile/actions';
import { Identifiers } from './compile/CompilerFacade';


/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {
        let actInjector = container.getActionInjector();
        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Component,
                { provide: BuildContext, useClass: ComponentContext },
                { provide: Identifiers, useValue: new Identifiers(container.getProxy())}
            );

        actInjector.getInstance(ResolveMoudleScope)
            .use(ParseTemplateHandle);


        const cls: DecoratorScope = 'Class';
        const prty: DecoratorScope = 'Property';

        actInjector.getInstance(DesignRegisterer)
            .register(Component, cls, TypeProviderAction, AnnoationAction, ComponentCompileAction)
            .register(Directive, cls, TypeProviderAction, AnnoationAction, DirectiveCompileAction)
            .register(Pipe, cls, TypeProviderAction, PipeRegAction)
            .register(Input, prty, BindingPropTypeAction)
            .register(Output, prty, BindingPropTypeAction)
            .register(RefChild, prty, BindingPropTypeAction)
            .register(Vaildate, prty, RegVaildateAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Component, cls, RegSingletionAction, IocSetCacheAction)
            .register(Directive, cls, RegSingletionAction, IocSetCacheAction);

    }

}
