import { AnnotationConfigure } from '@ts-ioc/bootstrap';

/**
 * Suite metadata.
 *
 * @export
 * @interface SuiteMetadata
 * @extends {ClassMetadata}
 */
export interface SuiteMetadata extends AnnotationConfigure<any> {
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
