
import { AutoWiredMetadata } from '../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../decorators';

export const Pointcut: IMethodDecorator<AutoWiredMetadata> = createMethodDecorator<AutoWiredMetadata>('Pointcut');
