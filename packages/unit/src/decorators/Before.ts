import { ITestDecorator, createTestDecorator } from './Test';
import { TestMetadata } from '../metadata/TestMetadata';

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
