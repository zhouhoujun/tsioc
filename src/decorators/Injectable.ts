import { Type } from '../Type';
import { ClassMetadata } from './Metadata';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';

/**
 * Injectable. default a
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends ClassMetadata {
    alias?: string;
}


/**
 * Injectable decorator and metadata. define a class.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator = createClassDecorator<InjectableMetadata>('Injectable');

