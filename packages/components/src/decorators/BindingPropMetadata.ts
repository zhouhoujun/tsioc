import { ParamPropMetadata } from '@tsdi/ioc';
import { BindingTypes, BindingDirection } from '../bindings/IBinding';

/**
 * binding property metadata.
 *
 * @export
 * @interface BindingPropertyMetadata
 * @extends {ParamPropMetadata}
 */
export interface BindingPropMetadata extends ParamPropMetadata {
    /**
     * binding name.
     *
     * @type {string}
     * @memberof BindingPropertyMetadata
     */
    bindingName?: string;
    /**
     * default value.
     *
     * @type {*}
     * @memberof BindingPropertyMetadata
     */
    defaultValue?: any;
    /**
     * binding types.
     *
     * @type {BindingTypes}
     * @memberof BindingPropertyMetadata
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
