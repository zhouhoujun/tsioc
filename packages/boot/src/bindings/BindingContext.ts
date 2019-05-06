import { IHandleContext, IBinding } from '../core';
import { IContainer } from '@tsdi/core';
import { Inject, ContainerFactoryToken, ContainerFactory, Injectable, Type } from '@tsdi/ioc';

@Injectable
export class BindingContext implements IHandleContext {

    template: any;

    type: Type<any>;

    binding: IBinding<any>;

    bindingValue?: any;

    constructor(@Inject(ContainerFactoryToken) protected raiseContainerGetter?: ContainerFactory) {

    }

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(template: any, binding: IBinding<any>, raiseContainer: ContainerFactory): BindingContext {
        let ctx = new BindingContext(raiseContainer);
        ctx.template = template;
        ctx.binding = binding;
        return ctx;
    }
}
