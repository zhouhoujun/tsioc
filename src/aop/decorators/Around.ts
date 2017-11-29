
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../../decorators';

export const Around: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Around');
