import { isString, isNumber, Type, createDecorator, DecoratorOption } from '@tsdi/ioc';
import { AnnotationReflect } from '@tsdi/boot';
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
 * @Suite decorator.
 */
export const Suite: ISuiteDecorator = createDecorator<SuiteMetadata>('Suite', {
    actionType: 'annoation',
    classHandle: (ctx, next) => {
        const reflect = ctx.reflect as AnnotationReflect;
        reflect.annoType = 'suite';
        reflect.annoDecor = ctx.decor;
        reflect.annotation = ctx.matedata;
        return next();
    },
    actions: [
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
    append: (metadata) => {
        metadata.singleton = true;
        return metadata;
    }
});






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
 * @returns {ITestDecorator<T>}
 */
export function createTestDecorator<T extends TestMetadata>(name: string, options?: TestDecorOption<T>): ITestDecorator<T> {
    options = options || {};
    return createDecorator<TestMetadata>(name, {
        ...options,
        actions: [
            ...options.hasTitle ? [(ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.title = arg;
                    ctx.next(next);
                }
            }] : [],
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.timeout = arg;
                    ctx.next(next);
                }
            },
            ...options.hasSetp ? [(ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.setp = arg;
                    ctx.next(next);
                }
            }] : []
        ]
    }) as ITestDecorator<T>;
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
export const Test: ITestCaseDecorator = createTestDecorator<TestCaseMetadata>('TestCase', { hasSetp: true, hasTitle: true }) as ITestCaseDecorator;



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
export const BeforeEach: IBeforeEachTestDecorator = createTestDecorator<TestMetadata>('BeforeEach') as IBeforeEachTestDecorator;


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
