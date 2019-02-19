import { createClassDecorator, IClassDecorator } from '../factories';
import { InjectableMetadata } from '../metadatas';

/**
 * Component decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<InjectableMetadata>}
 */
export interface IComponentDecorator extends IClassDecorator<InjectableMetadata> {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: InjectableMetadata): ClassDecorator;
}

/**
 * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: IComponentDecorator = createClassDecorator<InjectableMetadata>('Component');

