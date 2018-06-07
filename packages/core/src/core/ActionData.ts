import { Type, Token, Providers } from '../types';
import { IParameter } from '../IParameter';


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
     * exter providers for resolve.
     *
     * @type {Providers[]}
     * @memberof ActionData
     */
    providers?: Providers[];

    /**
     * execute context.
     *
     * @type {*}
     * @memberof ActionData
     */
    context?: any;
}

