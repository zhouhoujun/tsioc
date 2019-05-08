import { IHandleContext, IBinding } from '../../core';
import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type, IocActionContext, ProviderTypes } from '@tsdi/ioc';

@Injectable
export class ParseContext extends IocActionContext implements IHandleContext {

    template: any;

    selector?: Type<any>;

    type: Type<any>;

    binding: IBinding<any>;

    bindingValue?: any;

    /**
    * providers.
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];

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
