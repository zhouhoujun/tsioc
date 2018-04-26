import { createClassDecorator, IClassDecorator } from '../factories/index';
import { InjectableMetadata } from '../metadatas/index';



/**
 * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Component');

