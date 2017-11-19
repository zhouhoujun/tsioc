import { Type } from '../Type';
import { TypeMetadata } from '../metadatas';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';

/**
 * Singleton. default a
 *
 * @export
 * @interface SingletonMetadata
 */
export interface SingletonMetadata extends TypeMetadata {

}


/**
 * Singleton decorator and metadata. define a class.
 *
 * @Singleton
 */
export const Singleton: IClassDecorator<SingletonMetadata> = createClassDecorator<SingletonMetadata>('Singleton');

