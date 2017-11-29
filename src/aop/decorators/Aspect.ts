import { Type } from '../../Type';
import { createClassDecorator, IClassDecorator } from '../../decorators';
import { Token } from '../../types';
import { ClassMetadata } from '../../metadatas';
import { isClass } from '../../index';



/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});

