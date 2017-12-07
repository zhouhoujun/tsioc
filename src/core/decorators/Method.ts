
import { MethodMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../factories';

export const Method: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('Method');
