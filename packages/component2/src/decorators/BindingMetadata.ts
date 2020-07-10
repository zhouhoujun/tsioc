import { ParamPropMetadata } from '@tsdi/ioc';
import { BindingTypes, BindingDirection } from '../bindings/IBinding';

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
