import { Type } from '../Type';
import { createClassDecorator } from './factories';
import { ClassMetadata } from './Metadata';

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
 * @stable
 * @Annotation
 */
export const Injectable = createClassDecorator<InjectableMetadata>('Injectable');

