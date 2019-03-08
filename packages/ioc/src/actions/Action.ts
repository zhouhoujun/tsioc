import { IIocContainer } from '../IIocContainer';
import { ProviderMap, ParamProviders } from '../providers';
import { IParameter } from '../IParameter';
import { Type, Token, ObjectMap } from '../types';
import { IocCoreService, ITypeReflect } from '../services';
import { lang } from '../utils';
import { ResovleContext } from '../ResovleContext';


/**
 * ioc action context data.
 *
 * @export
 * @interface ActionData
 */
export interface IocActionContext {
    /**
     * the args.
     *
     * @type {any[]}
     * @memberof ActionData
     */
    args?: any[];

    /**
     * args params types.
     *
     * @type {IParameter[]}
     * @memberof ActionData
     */
    params?: IParameter[];

    /**
     * target instance.
     *
     * @type {*}
     * @memberof ActionData
     */
    target?: any;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof ActionData
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
     * @memberof ActionData
     */
    tokenKey?: Token<any>;

    /**
     * property or method name of type.
     *
     * @type {string}
     * @memberof ActionData
     */
    propertyKey?: string;

    /**
     * exter providers for resolve. origin providers
     *
     * @type {ParamProviders[]}
     * @memberof ActionData
     */
    providers?: ParamProviders[];

    /**
     * exter providers convert to map.
     *
     * @type {ProviderMap}
     * @memberof ActionData
     */
    providerMap?: ProviderMap;

    /**
     * container, the action raise from.
     *
     * @type {IContainer}
     * @memberof ActionData
     */
    raiseContainer?: IIocContainer;

    /**
     * execute context.
     *
     * @type {*}
     * @memberof ActionData
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
 * action.
 *
 * @export
 * @abstract
 * @class Action
 * @extends {IocCoreService}
 */
export abstract class IocAction<T> extends IocCoreService {
    constructor(protected container: IIocContainer) {
        super();
    }

    abstract execute(ctx: T, next: () => void): void;
}

export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

/**
 * ioc register action.
 *
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocAction<IocActionContext>}
 */
export abstract class IocRegisterAction extends IocAction<IocActionContext> {
    isRegister = true;
}

/**
 * ioc resolve action.
 *
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<IResovleContext>}
 */
export abstract class IocResolveAction extends IocAction<ResovleContext> {
    isResolve = true;
}
