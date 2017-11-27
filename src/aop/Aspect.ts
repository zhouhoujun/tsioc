import { Type } from '../Type';
import { createClassDecorator, IClassDecorator } from '../decorators';
import { Token } from '../types';
import { ClassMetadata } from '../metadatas';
import { isClass } from '../index';



/**
 * Aspect decorator and metadata. define a class.
 *
 * @Aspect
 */
export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect');

