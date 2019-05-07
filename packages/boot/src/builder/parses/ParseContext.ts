import { IHandleContext, IBinding } from '../../core';
import { IContainer } from '@tsdi/core';
import { Inject, ContainerFactoryToken, ContainerFactory, Injectable, Type } from '@tsdi/ioc';

@Injectable
export class ParseContext implements IHandleContext {

    template: any;

    selector?: Type<any>;

    type: Type<any>;

    binding: IBinding<any>;

    bindingValue?: any;

    constructor(@Inject(ContainerFactoryToken) protected raiseContainerGetter?: ContainerFactory) {

    }

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, template: any, binding: IBinding<any>, raiseContainer: ContainerFactory): ParseContext {
        let ctx = new ParseContext(raiseContainer);
        ctx.type = type;
        ctx.template = template;
        ctx.binding = binding;
        return ctx;
    }
}
