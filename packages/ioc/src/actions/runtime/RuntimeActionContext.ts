import { ObjectMap, Type, Token } from '../../types';
import { IParameter } from '../../IParameter';
import { ITypeReflect } from '../../services';
import { ParamProviders, ProviderMap } from '../../providers';
import { IIocContainer } from '../../IIocContainer';
import { IResolverContainer } from '../../IResolver';
import { RegisterActionOption, RegisterActionContext } from '../RegisterActionContext';


/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RuntimeActionOption extends RegisterActionOption {
    /**
     * the args.
     *
     * @type {any[]}
     * @memberof RegisterActionContext
     */
    args?: any[];

    /**
     * args params types.
     *
     * @type {IParameter[]}
     * @memberof RegisterActionContext
     */
    params?: IParameter[];

    /**
     * target instance.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    target?: any;

    /**
     * property or method name of type.
     *
     * @type {string}
     * @memberof RegisterActionContext
     */
    propertyKey?: string;

    /**
     * exter providers for resolve. origin providers
     *
     * @type {ParamProviders[]}
     * @memberof RegisterActionContext
     */
    providers?: ParamProviders[];

    /**
     * exter providers convert to map.
     *
     * @type {ProviderMap}
     * @memberof RegisterActionContext
     */
    providerMap?: ProviderMap;

    /**
     * execute context.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    context?: any;

    /**
     * has injected.
     *
     * @type {ObjectMap<boolean>}
     * @memberof IocActionContext
     */
    injecteds?: ObjectMap<boolean>;
}

/**
 * Ioc Register action context.
 *
 * @export
 * @class RegisterActionContext
 * @extends {IocActionContext}
 */
export class RuntimeActionContext extends RegisterActionContext {

    /**
     * the args.
     *
     * @type {any[]}
     * @memberof RegisterActionContext
     */
    args?: any[];

    /**
     * args params types.
     *
     * @type {IParameter[]}
     * @memberof RegisterActionContext
     */
    params?: IParameter[];

    /**
     * target instance.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    target?: any;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof RegisterActionContext
     */
    targetType?: Type<any>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof IocActionContext
     */
    singleton?: boolean;

    /**
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token<any>;

    /**
     * property or method name of type.
     *
     * @type {string}
     * @memberof RegisterActionContext
     */
    propertyKey?: string;

    /**
     * exter providers for resolve. origin providers
     *
     * @type {ParamProviders[]}
     * @memberof RegisterActionContext
     */
    providers?: ParamProviders[];

    /**
     * exter providers convert to map.
     *
     * @type {ProviderMap}
     * @memberof RegisterActionContext
     */
    providerMap?: ProviderMap;

    /**
     * execute context.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    context?: any;

    /**
     * has injected.
     *
     * @type {ObjectMap<boolean>}
     * @memberof IocActionContext
     */
    injecteds?: ObjectMap<boolean>;

    constructor(targetType: Type<any>, tokenKey?: Token<any>) {
        super(targetType, tokenKey);
    }

    /**
     * create register context.
     *
     * @static
     * @param {RuntimeActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainerGetter]
     * @param {(IResolverContainer | (() => IResolverContainer))} [providersGetter]
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(options: RuntimeActionOption, raiseContainerGetter?: IIocContainer | (() => IIocContainer), providersGetter?: IResolverContainer | (() => IResolverContainer)): RuntimeActionContext {
        let ctx = new RegisterActionContext(options.targetType);
        ctx.setContext(ctx, options, raiseContainerGetter, providersGetter);
        return ctx;
    }


    setOptions(options: RuntimeActionOption) {
        super.setOptions(options);
    }

}
