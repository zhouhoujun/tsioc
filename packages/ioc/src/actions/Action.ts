import { IIocContainer } from '../IIocContainer';
import { ProviderMap, ParamProviders } from '../providers';
import { IParameter } from '../IParameter';
import { Type, Token, ObjectMap } from '../types';
import { IocCoreService, ITypeReflect } from '../services';


/**
*  action handle.
*/
export type IAction<T> = (ctx: T, next?: () => void) => any;

/**
 * execute action in chain.
 *
 * @export
 * @template T
 * @param {ActionHandle<T>[]} handles
 * @param {T} ctx
 * @param {() => void} [next]
 */
export function execAction<T>(handles: IAction<T>[], ctx: T, next?: () => void): void {
    let index = -1;
    function dispatch(idx: number): any {
        if (idx <= index) {
            return Promise.reject('next called mutiple times');
        }
        index = idx;
        let handle = idx < handles.length ? handles[idx] : null;
        if (idx === handles.length) {
            handle = next;
        }
        if (!handle) {
            return;
        }
        try {
            return handle(ctx, dispatch.bind(null, idx + 1));
        } catch (err) {
            throw err;
        }
    }
    dispatch(0);
}



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
export abstract class IocAction extends IocCoreService {
    constructor(protected container: IIocContainer) {
        super();
    }

    abstract execute(ctx: IocActionContext, next: () => void): void;
}

export type IocActionType = Type<IocAction> | IocAction | IAction<any>;
