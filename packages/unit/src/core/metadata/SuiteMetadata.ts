import { ClassMetadata } from '@ts-ioc/core';

/**
 * Suite metadata.
 *
 * @export
 * @interface SuiteMetadata
 * @extends {ClassMetadata}
 */
export interface SuiteMetadata extends ClassMetadata {
    /**
     * test suite describe message.
     *
     * @type {string}
     * @memberof FieldMetadata
     */
    describe?: string;

}
