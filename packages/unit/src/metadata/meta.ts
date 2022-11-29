import { ClassMetadata, TypeDef } from '@tsdi/ioc';

export interface SuiteDef extends TypeDef {
    suite?: boolean;
}

/**
 * Test metadata.
 *
 * @export
 * @interface TestMetadata
 * @extends {MethodMetadata}
 */
export interface TestMetadata {
    /**
     * test action type.
     *
     * @type {string}
     */
    action?: string;

    /**
     * test timeout.
     *
     * @type {number}
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
export interface BeforeTestMetadata extends TestMetadata { }

/**
 * before each test metadta.
 *
 * @export
 * @interface BeforeEachTestMetadata
 * @extends {TestMetadata}
 */
export interface BeforeEachTestMetadata extends TestMetadata { }

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
    */
    title?: string;

    /**
     * test setp
     *
     * @type {number}
     */
    setp?: number;
}



/**
 * Suite metadata.
 *
 * @export
 * @interface SuiteMetadata
 * @extends {AnnotationMetadata}
 */
export interface SuiteMetadata extends ClassMetadata {
    /**
     * test suite describe message.
     *
     * @type {string}
     */
    describe?: string;

    /**
     * all action default timeout.
     *
     * @type {number}
     */
    timeout?: number;

}
