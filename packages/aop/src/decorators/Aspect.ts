import { createClassDecorator, ITypeDecorator, ClassMetadata, Registration } from '@ts-ioc/core';

/**
 * Aspect decorator
 *
 * @export
 * @interface IAspectDecorator
 * @extends {ITypeDecorator<AspectMetadata>}
 */
export interface IAspectDecorator extends ITypeDecorator<ClassMetadata> {
    /**
     * Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {(Registration<any> | symbol | string)} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton.
     */
    (provide: Registration<any> | symbol | string, alias?: string, singlton?: boolean, cache?: number): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {AspectMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;
}


/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
export const Aspect: IAspectDecorator = createClassDecorator<ClassMetadata>('Aspect');

