import { Token } from '../../types';
import { TypeMetadata } from './TypeMetadata';
import { KeyValue } from '@taskfr/core';

/**
 * reference metadata.
 *
 * @export
 * @interface RefMetadata
 * @extends {TypeMetadata}
 */
export interface RefMetadata extends TypeMetadata {
    /**
     * define the class as service reference to target.
     *
     * @type {Token<any>}
     * @memberof RefMetadata
     */
    refTo?: Token<any>;
}

/**
 * add reference metadata. add ref service to the class.
 *
 * @export
 * @interface AddRefMetadata
 * @extends {TypeMetadata}
 */
export interface AddRefMetadata  extends TypeMetadata {

    /**
     * add ref service to the class.
     *
     * @type {KeyValue<Token<any>, Token<any>>}
     * @memberof AddRefMetadata
     */
    addRefs?: KeyValue<Token<any>, Token<any>>;
}
