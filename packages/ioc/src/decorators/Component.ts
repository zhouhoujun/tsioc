import { createClassDecorator, IClassDecorator } from '../factories';
import { InjectableMetadata } from '../metadatas';

/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {InjectableMetadata}
 */
export interface IComponentMetadata  extends InjectableMetadata {
    selector?: string;
}
/**
 * Component decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<IComponentMetadata>}
 */
export interface IComponentDecorator extends IClassDecorator<IComponentMetadata> {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {IComponentMetadata} [metadata] metadata map.
     */
    (metadata?: IComponentMetadata): ClassDecorator;
}

/**
 * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: IComponentDecorator = createClassDecorator<IComponentMetadata>('Component');

