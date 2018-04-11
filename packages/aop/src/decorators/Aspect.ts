import { createClassDecorator, IClassDecorator, ClassMetadata } from '@ts-ioc/core';


/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect');

