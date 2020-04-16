import { IAnnotationMetadata } from '@tsdi/boot';

/**
 * Suite metadata.
 *
 * @export
 * @interface SuiteMetadata
 * @extends {ClassMetadata}
 */
export interface SuiteMetadata extends IAnnotationMetadata {
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
