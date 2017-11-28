
import { MethodMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Method: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Method');
