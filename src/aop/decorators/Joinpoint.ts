
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../../decorators';

export const Joinpoint: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Joinpoint');
