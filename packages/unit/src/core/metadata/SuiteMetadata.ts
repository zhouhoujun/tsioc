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
     * @memberof SuiteMetadata
     */
    describe?: string;

    /**
     * all action default timeout.
     *
     * @type {number}
     * @memberof SuiteMetadata
     */
    timeout?: number;

}
