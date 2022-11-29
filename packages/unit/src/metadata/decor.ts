import { ActionTypes, createDecorator, DecoratorOption, EMPTY_OBJ } from '@tsdi/ioc';
import { RunnableFactory } from '@tsdi/core';
import { SuiteMetadata, SuiteDef, TestCaseMetadata, TestMetadata } from './meta';
import { SuiteRunnableFactory } from '../runner/SuiteRunner';


/**
 * Suite decorator type define.
 *
 * @export
 * @interface Suite
 */
export interface Suite {
    /**
     * suite decorator.
     * @param {string} suite describe.
     */
    (describe?: string): ClassDecorator;
    /**
     * suite decorator.
     * @param {string} suite describe.
     * @param {number} timeout suite timeout.
     */
    (describe: string, timeout: number): ClassDecorator;

    /**
     * suite decorator with metadata.
     */
    (metadata?: SuiteMetadata): ClassDecorator;
}


/**
 * @Suite decorator.
 */
export const Suite: Suite = createDecorator<SuiteMetadata>('Suite', {
    actionType: ActionTypes.annoation,
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.metadata);
            (ctx.class.annotation as SuiteDef).suite = true;
            return next()
        }
    },
    props: (describe: string, timeout?: number) => ({ describe, timeout }),
    appendProps: (metadata) => {
        metadata.singleton = true;
        return metadata
    },
    providers: [
        { provide: RunnableFactory, useClass: SuiteRunnableFactory }
    ]
});


/**
 * define the method of class as unit test case.
 *
 * @export
 * @interface TestDecorator
 * @template T
 */
export interface TestDecorator<T extends TestMetadata> {
    (timeout: number): MethodDecorator;
    (metadata?: T): MethodDecorator;
}

export interface TestDecorOption<T> extends DecoratorOption<T> {
    hasTitle?: boolean;
    hasSetp?: boolean;
}

/**
 * create Test decorator.
 *
 * @export
 * @template T
 * @param {string} [TestType]
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {TestDecorator<T>}
 */
export function createTestDecorator<T extends TestMetadata>(name: string, options?: TestDecorOption<T>): TestDecorator<T> {
    options = options || EMPTY_OBJ;
    return createDecorator<TestMetadata>(name, {
        props: (timeout: number, setp?: number) => ({ timeout, setp }),
        ...options
    }) as TestDecorator<T>
}

/**
 * test case decorator
 *
 * @export
 * @interface TestCase
 */
export interface TestCase extends TestDecorator<TestCaseMetadata> {
    /**
     * @Test decorator. define the method of class as unit test case.  Describe a specification or test-case with the given `title` and callback `fn` acting
     * as a thunk.
     *
     * @param {string} title test case title.
     * @param {number} [timeout] test case timeout.
     * @param {number} [setp] test case setp order in this test suite.
     */
    (title?: string, timeout?: number, setp?: number): MethodDecorator;
}

/**
 * @Test decorator. define the method of class as unit test case.  Describe a specification or test-case with the given `title` and callback `fn` acting
 * as a thunk.
 *
 * @export
 * @interface TestCase
 */
export const Test: TestCase = createTestDecorator<TestCaseMetadata>('TestCase', {
    props: (title?: string, timeout?: number, setp?: number) => ({ title, timeout, setp })
}) as TestCase;



/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface IBeforeTestDecorator
 * @extends {TestDecorator<TestMetadata>}
 */
export interface BeforeAll extends TestDecorator<TestMetadata> { }

/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface BeforeAll
 */
export const BeforeAll: BeforeAll = createTestDecorator<TestMetadata>('BeforeAll');
/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface BeforeAll
 */
export const Before = BeforeAll;

/**
 * @BeforeEach decorator. define the method of class as unit test action run before each test case.
 *
 * @export
 * @interface BeforeEach
 * @extends {TestDecorator<TestMetadata>}
 */
export interface BeforeEach extends TestDecorator<TestMetadata> { }

/**
 * @BeforeEach decorator. define the method of class as unit test action run before each test case.
 *
 * @export
 * @interface BeforeEach
 */
export const BeforeEach: BeforeEach = createTestDecorator<TestMetadata>('BeforeEach');

/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface AfterAll
 * @extends {TestDecorator<TestMetadata>}
 */
export interface AfterAll extends TestDecorator<TestMetadata> { }

/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface AfterAll
 */
export const AfterAll: AfterAll = createTestDecorator<TestMetadata>('AfterAll');
/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface AfterAll
 */
export const After = AfterAll;



/**
 * @AfterEach decorator. define the method of class as unit test action run after each test case.
 *
 * @export
 * @interface AfterEach
 */
export interface AfterEach extends TestDecorator<TestMetadata> {

}

/**
 * @AfterEach decorator. define the method of class as unit test action run after each test case.
 *
 * @export
 * @interface AfterEach
 */
export const AfterEach: AfterEach = createTestDecorator<TestMetadata>('TestAfterEach');
