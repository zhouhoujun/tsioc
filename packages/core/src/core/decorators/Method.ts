
import { MethodMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../factories';

/**
 * method decorator.
 *
 * @Method
 */
export const Method: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Method');
