import { ClassType, ITypeReflect, Token } from '@tsdi/ioc';

/**
 * binding types.
 *
 * @export
 * @enum {number}
 */
export enum BindingTypes {
    /**
     * static binding
     */
    static = 1,
    /**
     * dynamic binding.
     */
    dynamic
}

/**
 * binding.
 *
 * @export
 * @interface IBinding
 * @template T
 */
export interface IBinding<T> {
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
}

/**
 * binding type reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface IBindingTypeReflect extends ITypeReflect {
    /**
     * property binding metadata.
     *
     * @type {Map<string, IBinding<any>>}
     * @memberof IBindingTypeReflect
     */
    propBindings: Map<string, IBinding<any>>;
    /**
     * method params binding metadata.
     *
     * @type {Map<string, IBinding<any>[]>}
     * @memberof IBindingTypeReflect
     */
    paramsBindings: Map<string, IBinding<any>[]>;
}
