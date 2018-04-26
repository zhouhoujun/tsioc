
import { MethodMetadata } from '../metadatas/index';
import { createMethodDecorator, IMethodDecorator } from '../factories/index';

/**
 * method decorator.
 *
 * @Method
 */
export const Method: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Method');
