import { BindingTypes } from '../bindings';
import { ParamPropMetadata } from '@tsdi/ioc';

/**
 * binding property metadata.
 *
 * @export
 * @interface BindingPropertyMetadata
 * @extends {ParamPropMetadata}
 */
export interface BindingPropertyMetadata extends ParamPropMetadata {
    /**
     * binding name.s
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
}
