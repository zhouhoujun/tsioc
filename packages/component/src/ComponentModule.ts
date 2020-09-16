import {
    TypeProviderAction, IocSetCacheAction, RegSingletionAction,
    Inject, DecoratorProvider, DesignRegisterer, RuntimeRegisterer, IocExt, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { ResolveMoudleScope, AnnoationAction, BuildContext } from '@tsdi/boot';
import { Component, Directive, Pipe } from './decorators';


import { PipeRegAction } from './registers/PipeRegAction';
import { ComponentContext } from './ComponentContext';
import { DirectiveDefAction } from './registers/DirectiveDefAction';
import { ComponentDefAction } from './registers/ComponentDefAction';
import { ParseTemplateHandle } from './compile/actions';
import { Identifiers } from './compile/facade';


/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@IocExt()
export class ComponentModule {

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

        actInjector.getInstance(DesignRegisterer)
            .register(Component, cls, TypeProviderAction, AnnoationAction, ComponentDefAction)
            .register(Directive, cls, TypeProviderAction, AnnoationAction, DirectiveDefAction)
            .register(Pipe, cls, TypeProviderAction, PipeRegAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Component, cls, RegSingletionAction, IocSetCacheAction)
            .register(Directive, cls, RegSingletionAction, IocSetCacheAction)
            .register(Pipe, cls, RegSingletionAction, IocSetCacheAction);

    }

}
