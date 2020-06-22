import { createClassDecorator, ITypeDecorator } from '../factories/ClassDecoratorFactory';
import { ClassMetadata } from '../metadatas/ClassMetadata';
import { Type } from '../types';

export interface IAbstractDecorator<T> {
    /**
     * define class is abstract class.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: T): ClassDecorator;
    /**
     * define class is abstract class.
     */
    (target: Type): void;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Abstract');

