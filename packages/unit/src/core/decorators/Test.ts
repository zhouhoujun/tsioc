
import { createPropDecorator, MetadataExtends, MetadataAdapter, isString, isNumber, IMethodDecorator, createMethodDecorator } from '@ts-ioc/core';
import { TestMetadata, TestCaseMetadata } from '../metadata';


/**
 * define the method of class as unit test action.
 *
 * @export
 * @interface ITestDecorator
 * @template T
 */
export interface ITestDecorator<T extends TestMetadata> extends IMethodDecorator<T> {

}


/**
 * create Test decorator.
 *
 * @export
 * @template T
 * @param {string} [TestType]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {ITestDecorator<T>}
 */
export function createTestDecorator<T extends TestMetadata>(
    action: string,
    adapter?: MetadataAdapter,
    metaExtends?: MetadataExtends<T>): ITestDecorator<T> {
    return createMethodDecorator<TestMetadata>('Test',
        args => {
            if (adapter) {
                adapter(args);
            }
        },
        (metadata: T) => {
            if (metaExtends) {
                metadata = metaExtends(metadata)
            }
            metadata.action = action;
            return metadata;
        }) as ITestDecorator<T>;
}

export interface ITestCaseDecorator extends ITestDecorator<TestCaseMetadata>  {
    /**
     * @Test decorator. define the method of class as unit test case.  Describe a specification or test-case with the given `title` and callback `fn` acting
     * as a thunk.
     *
     * @param {string} title test case title.
     * @param {number} [timeout] test case timeout.
     * @param {number} [setp] test case setp order in this test suite.
     */
    (title: string, timeout?: number, setp?: number): MethodDecorator;
}

/**
 * @Test decorator. define the method of class as unit test case.  Describe a specification or test-case with the given `title` and callback `fn` acting
 * as a thunk.
 *
 * @export
 * @interface ITestDecorator
 * @template T
 */
export const Test: ITestCaseDecorator = createTestDecorator<TestCaseMetadata>('Case', args => {
    args.next<TestCaseMetadata>({
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.title = arg;
        }
    });

    args.next<TestCaseMetadata>({
        match: (arg) => isNumber(arg),
        setMetadata: (metadata, arg) => {
            metadata.timeout = arg;
        }
    });

    args.next<TestCaseMetadata>({
        match: (arg) => isNumber(arg),
        setMetadata: (metadata, arg) => {
            metadata.setp = arg;
        }
    });
}) as ITestCaseDecorator;

