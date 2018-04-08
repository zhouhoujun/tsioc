import { createClassDecorator, IClassDecorator } from '../factories/index';
import { InjectableMetadata } from '../metadatas/index';



/**
 * Component decorator and metadata. define a class.
 *
 * @Component
 */
export const Component: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Component');

