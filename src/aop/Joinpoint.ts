
import { AutoWiredMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Joinpoint: IMethodDecorator<AutoWiredMetadata> = createMethodDecorator<AutoWiredMetadata>('Joinpoint');
