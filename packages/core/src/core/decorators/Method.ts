
import { MethodMetadata } from '../metadatas/index';
import { createMethodDecorator, IMethodDecorator } from '../factories/index';

export const Method: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Method');
