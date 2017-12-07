import { PropertyMetadata } from './PropertyMetadata';

export interface ParameterMetadata extends PropertyMetadata {
    /**
     * parameter index.
     *
     * @type {number}
     * @memberof ParameterMetadata
     */
    index?: number;

    /**
     * default value
     *
     * @type {object}
     * @memberof ParameterMetadata
     */
    defaultValue?: object
}
