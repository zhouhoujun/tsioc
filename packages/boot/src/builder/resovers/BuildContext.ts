import { ModuleConfigure } from '../../core';
import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type, IocActionContext, ProviderTypes } from '@tsdi/ioc';
import { IComponentContext } from '../ComponentContext';

export interface IModuleResolveOption {

    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;

    template?: any;

    decorator?: string;

    /**
     * annoation metadata config.
     *
     * @type {ModuleConfigure}
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
}

@Injectable
export class BuildContext extends IocActionContext implements IComponentContext {

    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;
    /**
     * template of module.
     *
     * @type {*}
     * @memberof BuildContext
     */
    template: any;

    type: Type<any>;

    target?: any;

    decorator: string;

    /**
     * annoation metadata config.
     *
     * @type {ModuleConfigure}
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

    constructor(type: Type<any>) {
        super();
        this.type = type;
    }


    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, options: IModuleResolveOption, raiseContainer: IContainer | ContainerFactory): BuildContext {
        let ctx = new BuildContext(type);
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
