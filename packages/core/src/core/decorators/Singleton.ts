import { Type } from '../../types';
import { createClassDecorator, ITypeDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';
import { Registration } from '../../Registration';

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 *
 * @export
 * @interface ISingletonDecorator
 * @extends {IClassDecorator<ClassMetadata>}
 */
export interface ISingletonDecorator extends ITypeDecorator<ClassMetadata> {
    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton
     *
     * @param {(Registration<any> | symbol | string)} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provide: Registration<any> | symbol | string, alias?: string): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;
}

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 */
export const Singleton: ISingletonDecorator = createClassDecorator<ClassMetadata>('Singleton', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
}) as ISingletonDecorator;

