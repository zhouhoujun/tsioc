
import { AutoWiredMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Runner: IMethodDecorator<AutoWiredMetadata> = createMethodDecorator<AutoWiredMetadata>('Runner');
