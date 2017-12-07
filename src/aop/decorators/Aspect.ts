import { Type } from '../../Type';
import { Token } from '../../types';
import { isClass } from '../../utils';
import { createClassDecorator, IClassDecorator, ClassMetadata } from '../../core';


/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});

