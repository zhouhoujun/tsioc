import { ContainerFactory, Injectable, Type, ProviderTypes, IocRaiseContext, ITypeReflect, createRaiseContext } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ModuleConfigure, IModuleReflect } from '../../core';
import { IComponentContext } from '../ComponentContext';

/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface IModuleResolveOption {
    type?: Type;
    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;

    template?: any;

    parsing?: boolean;

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
    raiseContainer?: ContainerFactory<IContainer>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;
}

@Injectable
export class BuildContext extends IocRaiseContext<IContainer> implements IComponentContext {

    targetReflect?: IModuleReflect;
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
    template?: any;

    parsing?: boolean;

    /**
     * instance of current type annoation template
     *
     * @type {*}
     * @memberof BuildContext
     */
    composite?: any;

    /**
     * current module type.
     *
     * @type {Type}
     * @memberof BuildContext
     */
    type: Type;

    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    target?: any;

    /**
     * decorator.
     *
     * @type {string}
     * @memberof BuildContext
     */
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

    constructor(type: Type) {
        super();
        this.type = type;
    }

    static parse(target: Type | IModuleResolveOption, raiseContainer?: ContainerFactory<IContainer>): BuildContext {
        return createRaiseContext(BuildContext, target, raiseContainer);
    }
}
