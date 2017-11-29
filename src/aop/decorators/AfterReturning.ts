
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../../decorators';

export const AfterReturning: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('AfterReturning');
