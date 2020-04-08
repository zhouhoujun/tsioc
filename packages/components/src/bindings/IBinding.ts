import { ClassType, Token, isString } from '@tsdi/ioc';

/**
 * binding types.
 *
 * static: static binding.
 * dynamic：dynamic binding.
 *
 */
export type BindingTypes = 'static' | 'dynamic';

/**
 * binding direction.
 *
 * input: input binding.
 * output: output binding.
 */
export type BindingDirection = 'input' | 'output' | 'twoway';

export function isBindingDriection(target: any): target is BindingDirection {
    return isString(target) && (target === 'input' || target === 'output' || target === 'twoway');
}

/**
 * binding.
 *
 * @export
 * @interface IBinding
 * @template T
 */
export interface IBinding<T = any> {
    /**
     * binding property name.
     *
     * @type {string}
     * @memberof IBinding
     */
    name: string;
    /**
     * binding name. target template or option field name.
     *
     * @type {string}
     * @memberof IBinding
     */
    bindingName?: string;
    /**
     * configed binding type.
     *
     * @type {BindingTypes}
     * @memberof IBinding
     */
    bindingType?: BindingTypes;
    /**
     * type of property.
     *
     * @type {ClassType<T>}
     * @memberof IBinding
     */
    type: ClassType<T>;
    /**
     * provider of the type.
     *
     * @type {Token<T>}
     * @memberof IBinding
     */
    provider?: Token<T>,
    /**
     * binding value.
     *
     * @type {T}
     * @memberof IBinding
     */
    bindingValue?: T;
    /**
     * default value.
     *
     * @type {T}
     * @memberof IBinding
     */
    defaultValue?: T;
    /**
     * decorator
     *
     * @type {string}
     * @memberof IBinding
     */
    decorator?: string;
    /**
     * binding direction.
     *
     * @type {BindingDirections}
     * @memberof IBinding
     */
    direction?: BindingDirection;
}

/**
 * property vaildate.
 */
export interface IPropertyVaildate {
    required?: boolean;
    vaild?: (value: any, target?: any) => boolean | Promise<boolean>;
    errorMsg?: string;
}
