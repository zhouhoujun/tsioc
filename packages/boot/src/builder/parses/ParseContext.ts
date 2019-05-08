import { IHandleContext, IBinding } from '../../core';
import { IContainer } from '@tsdi/core';
import { Inject, ContainerFactoryToken, ContainerFactory, Injectable, Type, IocActionContext } from '@tsdi/ioc';

@Injectable
export class ParseContext extends IocActionContext implements IHandleContext {

    template: any;

    selector?: Type<any>;

    type: Type<any>;

    binding: IBinding<any>;

    bindingValue?: any;

    constructor(type?: Type<any>, template?: any, binding?: IBinding<any>) {
        super();
        this.type = type;
        this.template = template;
        this.binding = binding;
    }

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, template: any, binding: IBinding<any>, raiseContainer: IContainer | ContainerFactory): ParseContext {
        let ctx = new ParseContext(type, template, binding);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
