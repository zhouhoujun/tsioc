import { createClassDecorator, IClassDecorator } from '../factories/index';
import { InjectableMetadata } from '../metadatas/index';




/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Injectable');

