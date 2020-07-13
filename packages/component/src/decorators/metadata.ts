import { InjectableMetadata, ParamPropMetadata } from '@tsdi/ioc';
import { BindingTypes, BindingDirection } from '../bindings/IBinding';

/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {InjectableMetadata}
 */
export interface IDirectiveMetadata extends InjectableMetadata {
    /**
     * decotactor selector.
     *
     * @type {string}
     * @memberof IComponentMetadata
     */
    selector?: string;
}


/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {IDirectiveMetadata}
 */
export interface IComponentMetadata extends IDirectiveMetadata {
    /**
     * component selector.
     *
     * @type {string}
     * @memberof IComponentMetadata
     */
    selector?: string;
    /**
     * template for component.
     *
     * @type {*}
     * @memberof IComponentMetadata
     */
    template?: any;
}


/**
 * binding property metadata.
 *
 * @export
 * @interface BindingMetadata
 * @extends {ParamPropMetadata}
 */
export interface BindingMetadata extends ParamPropMetadata {
    /**
     * binding name.
     *
     * @type {string}
     * @memberof BindingMetadata
     */
    bindingName?: string;
    /**
     * default value.
     *
     * @type {*}
     * @memberof BindingMetadata
     */
    defaultValue?: any;
    /**
     * binding types.
     *
     * @type {BindingTypes}
     * @memberof BindingMetadata
     */
    bindingType?: BindingTypes;

    /**
     * binding direction.
     *
     * @type {BindingDirections}
     * @memberof IBinding
     */
    direction?: BindingDirection;
}
