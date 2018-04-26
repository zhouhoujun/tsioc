import { createClassDecorator, ITypeDecorator } from '../factories/index';
import { InjectableMetadata } from '../metadatas/index';
import { Registration } from '../../Registration';

/**
 * Injectable decorator
 * 
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<InjectableMetadata>}
 */
export interface ISingletonDecorator extends ITypeDecorator<InjectableMetadata> {
    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable
     * 
     * @param {(Registration<any> | symbol | string)} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton. 
     */
    (provide: Registration<any> | symbol | string, alias?: string, singlton?: boolean, cache?: number): ClassDecorator;

    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable
     * 
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: InjectableMetadata): ClassDecorator;
}


/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable
 */
export const Injectable: ISingletonDecorator = createClassDecorator<InjectableMetadata>('Injectable');

