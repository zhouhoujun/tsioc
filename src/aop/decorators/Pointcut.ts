
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../../decorators';

export const Pointcut: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Pointcut');
