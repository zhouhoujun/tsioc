import { ModuleConfigure } from '../../core';
import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type, ProviderTypes, IocRaiseContext } from '@tsdi/ioc';
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

    /**
     * raise contianer.
     *
     * @type {ContainerFactory}
     * @memberof IModuleResolveOption
     */
    raiseContainer?: ContainerFactory;
}

@Injectable
export class BuildContext extends IocRaiseContext implements IComponentContext {

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

    /**
     * instance of current type annoation template
     *
     * @type {*}
     * @memberof BuildContext
     */
    component?: any;
    /**
     * current module type.
     *
     * @type {Type<any>}
     * @memberof BuildContext
     */
    type: Type<any>;

    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
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

    /**
     * current args providers.
     *
     * @type {ProviderTypes[]}
     * @memberof BuildContext
     */
    argsProviders?: ProviderTypes[];

    constructor(type: Type<any>) {
        super();
        this.type = type;
    }


    getRaiseContainer(): IContainer {
        return this.raiseContainer() as IContainer;
    }

    static parse(type: Type<any>, options: IModuleResolveOption, raiseContainer?: IContainer | ContainerFactory): BuildContext {
        let ctx = new BuildContext(type);
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
