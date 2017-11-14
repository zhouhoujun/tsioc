import { Type } from '../Type';
import { createClassDecorator, ClassMetadata } from './factories';

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

