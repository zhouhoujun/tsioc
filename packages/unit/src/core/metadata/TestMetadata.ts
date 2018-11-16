import { MethodMetadata } from '@ts-ioc/core';

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
     * test timeout.
     *
     * @type {number}
     * @memberof TestCaseMetadata
     */
    timeout?: number;
    /**
     * test setp
     *
     * @type {number}
     * @memberof TestCaseMetadata
     */
    setp?: number;
}
