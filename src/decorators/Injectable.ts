import { Type } from '../Type';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';
import { Token } from '../types';
import { InjectableMetadata } from '../metadatas';
import { isClass } from '../index';



/**
 * Injectable decorator and metadata. define a class.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Injectable');

