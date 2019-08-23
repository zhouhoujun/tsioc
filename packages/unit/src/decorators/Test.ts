import { MetadataExtends, isString, isNumber, createMethodDecorator, ArgsIteratorAction } from '@tsdi/ioc';
import { TestMetadata, TestCaseMetadata } from '../metadata/TestMetadata';
import { isArray } from 'util';


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

