
import { MethodMetadata } from '../metadatas/index';
import { createMethodDecorator, IMethodDecorator } from '../factories/index';

export const AutoRun: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('AutoRun');
