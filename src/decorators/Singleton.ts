import { Type } from '../Type';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';
import { SingletonMetadata } from '../metadatas';

/**
 * Singleton decorator and metadata. define a class.
 *
 * @Singleton
 */
export const Singleton: IClassDecorator<SingletonMetadata> = createClassDecorator<SingletonMetadata>('Singleton');

