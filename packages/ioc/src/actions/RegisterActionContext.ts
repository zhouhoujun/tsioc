import { ObjectMap, Type, Token } from '../types';
import { IocActionContext } from './Action';
import { IParameter } from '../IParameter';
import { ITypeReflect } from '../services';
import { ParamProviders, ProviderMap } from '../providers';

/**
 * Ioc Register action context.
 *
 * @export
 * @class RegisterActionContext
 * @extends {IocActionContext}
 */
export class RegisterActionContext extends IocActionContext {

    constructor(targetType: Type<any>, tokenKey?: Token<any>) {
        super();
        this.targetType = targetType;
        this.tokenKey = tokenKey;
    }
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
}
