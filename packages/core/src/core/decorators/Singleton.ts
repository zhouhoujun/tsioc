import { Type } from '../../types';
import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 */
export const Singleton: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Singleton', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});

