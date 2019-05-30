import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type } from '@tsdi/ioc';
import { BuildContext, IModuleResolveOption, IComponentContext } from '@tsdi/boot';

export interface ITemplateOption extends IModuleResolveOption  {
    scope?: any;
    selector?: Type<any>;
}

@Injectable
export class TemplateContext extends BuildContext implements IComponentContext {

    selector?: Type<any>;

    scope?: any;

    value?: any;

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, options: ITemplateOption, raiseContainer: IContainer | ContainerFactory): TemplateContext {
        let ctx = new TemplateContext(type);
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
