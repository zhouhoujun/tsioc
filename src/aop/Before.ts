
import { AutoWiredMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Before: IMethodDecorator<AutoWiredMetadata> = createMethodDecorator<AutoWiredMetadata>('Before');
