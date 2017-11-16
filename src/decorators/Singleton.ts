import { Type } from '../Type';
import { ClassMetadata } from './Metadata';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';

/**
 * Singleton. default a
 *
 * @export
 * @interface SingletonMetadata
 */
export interface SingletonMetadata extends ClassMetadata {

}


/**
 * Singleton decorator and metadata. define a class.
 *
 * @Singleton
 */
export const Singleton: IClassDecorator = createClassDecorator<SingletonMetadata>('Singleton');

