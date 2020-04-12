import { ITestDecorator, createTestDecorator } from './Test';
import { TestMetadata } from '../metadata/TestMetadata';

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
