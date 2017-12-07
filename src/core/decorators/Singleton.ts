import { Type } from '../../Type';
import { createClassDecorator, IClassDecorator } from '../factories';
import { ClassMetadata } from '../metadatas';

/**
 * Singleton decorator and metadata. define a class.
 *
 * @Singleton
 */
export const Singleton: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Singleton', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});

