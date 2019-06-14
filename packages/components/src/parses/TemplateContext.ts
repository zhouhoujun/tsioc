import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type, IocActionContext, ProviderTypes } from '@tsdi/ioc';
import { IModuleResolveOption, IComponentContext, ModuleConfigure } from '@tsdi/boot';

export interface ITemplateOption extends IModuleResolveOption  {
    selector?: Type<any>;
}

@Injectable
export class TemplateContext extends IocActionContext implements IComponentContext {

    selector?: Type<any>;

    scope?: any;

    value?: any;

    template?: any;

    decorator?: string;

    /**
     * annoation metadata config.
     *
     * @type {IAnnotationMetadata}
     * @memberof BuildContext
     */
    annoation?: ModuleConfigure;
    /**
    * providers.
    *
    * @type {ProviderTypes[]}
    * @memberof BootOptions
    */
    providers?: ProviderTypes[];

    getRaiseContainer(): IContainer {
        return this.raiseContainer() as IContainer;
    }

    static parse(options: ITemplateOption, raiseContainer?: IContainer | ContainerFactory): TemplateContext {
        let ctx = new TemplateContext();
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
