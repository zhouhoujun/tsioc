
import { AutoWiredMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const After: IMethodDecorator<AutoWiredMetadata> = createMethodDecorator<AutoWiredMetadata>('After');
