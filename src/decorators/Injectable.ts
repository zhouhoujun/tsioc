import { Type } from '../Type';
import { createClassDecorator } from './factories';

/**
 * Injectable. default a
 *
 * @export
 * @interface InjectableDecorator
 */
export interface InjectableDecorator {
    (): any;
    new (): any;
}


/**
 * Injectable decorator and metadata. define a class.
 *
 * @stable
 * @Annotation
 */
export const Injectable = createClassDecorator<InjectableDecorator>('Injectable');

