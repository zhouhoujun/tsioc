import { MethodMetadata } from '@tsdi/ioc';
import { IAnnotationMetadata } from '@tsdi/boot';

/**
 * Test metadata.
 *
 * @export
 * @interface TestMetadata
 * @extends {MethodMetadata}
 */
export interface TestMetadata extends MethodMetadata {
    /**
     * test action type.
     *
     * @type {string}
     * @memberof TestMetadata
     */
    action?: string;

    /**
     * test timeout.
     *
     * @type {number}
     * @memberof TestMetadata
     */
    timeout?: number;
}

/**
 * before test metadta.
 *
 * @export
 * @interface BeforeTestMetadata
 * @extends {TestMetadata}
 */
export interface BeforeTestMetadata extends TestMetadata {

}

/**
 * before each test metadta.
 *
 * @export
 * @interface BeforeEachTestMetadata
 * @extends {TestMetadata}
 */
export interface BeforeEachTestMetadata extends TestMetadata {

}

/**
 * test case metadata.
 *
 * @export
 * @interface TestCaseMetadata
 * @extends {TestMetadata}
 */
export interface TestCaseMetadata extends TestMetadata {
    /**
    * test case title.  Describe a specification or test-case with the given `title` and callback `fn` acting
    * as a thunk.
    *
    * @type {string}
    * @memberof TestCaseMetadata
    */
    title?: string;

    /**
     * test setp
     *
     * @type {number}
     * @memberof TestCaseMetadata
     */
    setp?: number;
}



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
