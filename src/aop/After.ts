
import { MethodMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const After: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('After');
