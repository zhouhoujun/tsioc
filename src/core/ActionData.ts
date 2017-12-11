import { ObjectMap } from '../types';
import { IContainer } from '../IContainer';
import { Type } from '../Type';


/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {

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
     * execute context.
     *
     * @type {*}
     * @memberof ActionData
     */
    context?: any;
}

