import { Type, Token, ProviderTypes } from '../types';
import { IParameter } from '../IParameter';
import { ProviderMap } from './providers';
import { IContainer } from '../IContainer';


/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {

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
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof ActionData
     */
    tokenKey?: Token<any>;

    /**
     * is target singleton or not.
     *
     * @type {boolean}
     * @memberof ActionData
     */
    singleton?: boolean;

    /**
     * property or method name of type.
     *
     * @type {string}
     * @memberof ActionData
     */
    propertyKey?: string;

    /**
     * action execute result.
     *
     * @type {T}
     * @memberof ActionData
     */
    execResult?: T;

    /**
     * exter providers for resolve. origin providers
     *
     * @type {ProviderTypes[]}
     * @memberof ActionData
     */
    providers?: ProviderTypes[];

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
    raiseContainer?: IContainer;

    /**
     * execute context.
     *
     * @type {*}
     * @memberof ActionData
     */
    context?: any;
}

