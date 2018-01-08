import { createClassDecorator, IClassDecorator } from '../factories/index';
import { InjectableMetadata } from '../metadatas/index';




/**
 * Injectable decorator and metadata. define a class.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Injectable');

