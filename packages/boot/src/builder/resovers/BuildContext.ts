import { IHandleContext, IBinding } from '../../core';
import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type, IocActionContext, ProviderTypes } from '@tsdi/ioc';

@Injectable
export class BuildContext extends IocActionContext implements IHandleContext {

    template: any;

    type: Type<any>;

    target?: any;

    decorator?: string;
    /**
    * providers.
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];

    constructor(type: Type<any>, template?: any) {
        super();
        this.type = type;
        this.template = template;
    }


    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, template: any, raiseContainer: IContainer | ContainerFactory): BuildContext {
        let ctx = new BuildContext(type, template);
        ctx.type = type;
        ctx.template = template;
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
