import { PropertyMetadata } from './PropertyMetadata';

export interface ParameterMetadata extends PropertyMetadata {
    /**
     * parameter index.
     *
     * @type {number}
     * @memberof ParameterMetadata
     */
    index?: number;
}
