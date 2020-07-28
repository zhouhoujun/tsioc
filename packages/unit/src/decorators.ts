import { MetadataExtends, createClassDecorator, isString, isNumber, ArgsIteratorAction, Type, createMethodDecorator, isArray } from '@tsdi/ioc';
import { SuiteMetadata, TestCaseMetadata, TestMetadata } from './metadata';


/**
 * Suite decorator type define.
 *
 * @export
 * @interface ISuiteDecorator
 * @template T
 */
export interface ISuiteDecorator {
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

    /**
     * suite decorator.
     */
    (target: Type): void;
}

/**
 * create filed decorator.
 *
 * @export
 * @template T
 * @param {string} [SuiteType]
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {IFiledDecorator<T>}
 */
export function createSuiteDecorator<T extends SuiteMetadata>(
    actions?: ArgsIteratorAction<T>[],
    metaExtends?: MetadataExtends<T>): ISuiteDecorator {
    return createClassDecorator<SuiteMetadata>('Suite',
        [
            ...(actions || []),
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.describe = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.timeout = arg;
                    ctx.next(next);
                }
            }
        ],
        (metadata: T) => {
            if (metaExtends) {
                metaExtends(metadata);
            }
            metadata.singleton = true;
            return metadata;
        }) as ISuiteDecorator;
}

export const Suite: ISuiteDecorator = createSuiteDecorator<SuiteMetadata>();






/**
 * define the method of class as unit test case.
 *
 * @export
 * @interface ITestDecorator
 * @template T
 */
export interface ITestDecorator<T extends TestMetadata> {
    (timeout: number): MethodDecorator;
    (metadata?: T): MethodDecorator;
}


/**
 * create Test decorator.
 *
 * @export
 * @template T
 * @param {string} [TestType]
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {ITestDecorator<T>}
 */
export function createTestDecorator<T extends TestMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T> | ArgsIteratorAction<T>[],
    finallyActions?: ArgsIteratorAction<T> | ArgsIteratorAction<T>[],
    metaExtends?: MetadataExtends<T>): ITestDecorator<T> {
    return createMethodDecorator<TestMetadata>(name,
        [
            ...(actions ? (isArray(actions) ? actions : [actions]) : []),
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.timeout = arg;
                    ctx.next(next);
                }
            },
            ...(finallyActions ? (isArray(finallyActions) ? finallyActions : [finallyActions]) : [])
        ], metaExtends) as ITestDecorator<T>;
}

/**
 * test case decorator
 *
 * @export
 * @interface ITestCaseDecorator
 * @extends {ITestDecorator<TestCaseMetadata>}
 */
export interface ITestCaseDecorator extends ITestDecorator<TestCaseMetadata> {
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
 * @interface ITestDecorator
 * @template T
 */
export const Test: ITestCaseDecorator = createTestDecorator<TestCaseMetadata>('TestCase',
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.title = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isNumber(arg)) {
            ctx.metadata.setp = arg;
            ctx.next(next);
        }
    }) as ITestCaseDecorator;



/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface IBeforeTestDecorator
 * @extends {ITestDecorator<TestMetadata>}
 */
export interface IBeforeTestDecorator extends ITestDecorator<TestMetadata> {

}

/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface IBeforeTestDecorator
 * @template T
 */
export const BeforeAll: IBeforeTestDecorator = createTestDecorator<TestMetadata>('BeforeAll') as IBeforeTestDecorator;
/**
 * @BeforeAll decorator. define the method of class as unit test action run before all test case.
 *
 * @export
 * @interface IBeforeTestDecorator
 * @template T
 */
export const Before = BeforeAll;



/**
 * @BeforeEach decorator. define the method of class as unit test action run before each test case.
 *
 * @export
 * @interface IBeforeEachTestDecorator
 * @extends {ITestDecorator<TestMetadata>}
 */
export interface IBeforeEachTestDecorator extends ITestDecorator<TestMetadata> {

}

/**
 * @BeforeEach decorator. define the method of class as unit test action run before each test case.
 *
 * @export
 * @interface IBeforeEachTestDecorator
 * @template T
 */
export const BeforeEach: IBeforeEachTestDecorator = createTestDecorator<TestMetadata>('TestBeforeEach') as IBeforeEachTestDecorator;


/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface IAfterTestDecorator
 * @extends {ITestDecorator<TestMetadata>}
 */
export interface IAfterTestDecorator extends ITestDecorator<TestMetadata> {

}

/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface IAfterTestDecorator
 * @template T
 */
export const AfterAll: IAfterTestDecorator = createTestDecorator<TestMetadata>('AfterAll') as IAfterTestDecorator;
/**
 * @AfterAll decorator. define the method of class as unit test action run after all test case.
 *
 * @export
 * @interface IAfterTestDecorator
 * @template T
 */
export const After = AfterAll;



/**
 * @AfterEach decorator. define the method of class as unit test action run after each test case.
 *
 * @export
 * @interface IAfterEachTestDecorator
 * @extends {ITestDecorator<TestMetadata>}
 */
export interface IAfterEachTestDecorator extends ITestDecorator<TestMetadata> {

}

/**
 * @AfterEach decorator. define the method of class as unit test action run after each test case.
 *
 * @export
 * @interface IAfterEachTestDecorator
 * @template T
 */
export const AfterEach: IAfterEachTestDecorator = createTestDecorator<TestMetadata>('TestAfterEach') as IAfterEachTestDecorator;
