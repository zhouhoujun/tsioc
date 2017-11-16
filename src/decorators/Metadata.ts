import { Type } from '../Type';

/**
 * metadata
 *
 * @export
 * @interface Metadate
 */
export interface Metadate {
    /**
     * decorator name.
     *
     * @type {string}
     * @memberof Metadate
     */
    decorator?: string;
}

/**
 * class metadata
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends Metadate {

    /**
     * property type
     *
     * @type {(Type<any> | string)}
     * @memberof PropertyMetadata
     */
    type?: Type<any> | string;
}

/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends Metadate {
    /**
     * property name
     *
     * @type {(string | symbol)}
     * @memberof PropertyMetadata
     */
    propertyName?: string | symbol;

    /**
     * property type
     *
     * @type {Type<any>}
     * @memberof PropertyMetadata
     */
    type?: Type<any>;
}

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {

}

export interface ParameterMetadata extends Metadate {
    /**
     * parameter type
     *
     * @type {Type<any>}
     * @memberof ParameterMetadata
     */
    type?: Type<any>;

    /**
     * property name
     *
     * @type {(string | symbol)}
     * @memberof ParameterMetadata
     */
    propertyName?: string | symbol;

    /**
     * parameter index.
     *
     * @type {number}
     * @memberof ParameterMetadata
     */
    index?: number;
}
