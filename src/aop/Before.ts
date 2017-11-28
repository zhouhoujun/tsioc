
import { MethodMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Before: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Before');
