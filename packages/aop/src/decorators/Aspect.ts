import { createClassDecorator, IClassDecorator, ClassMetadata } from '@tsioc/core';


/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect');

