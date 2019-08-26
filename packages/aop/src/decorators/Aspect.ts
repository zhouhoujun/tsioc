import { createClassDecorator, ITypeDecorator, Registration, Type, isString, isClass, isArray, ClassType } from '@tsdi/ioc';
import { AspectMetadata } from '../metadatas';

/**
 * Aspect decorator
 *
 * @export
 * @interface IAspectDecorator
 * @extends {ITypeDecorator<AspectMetadata>}
 */
export interface IAspectDecorator extends ITypeDecorator<AspectMetadata> {
    /**
     * Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {string} annotation set pointcut in the class with the annotation decorator only.
     * @param {(ClassType | ClassType[])>} [within]  set pointcut in the class with the annotation decorator only.
     * @param {(Registration | symbol | string)} [provide] define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton.
     */
    (annotation: string, within?: ClassType | ClassType[], provide?: Registration | symbol | string, alias?: string, singlton?: boolean, cache?: number): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {AspectMetadata} [metadata] metadata map.
     */
    (metadata?: AspectMetadata): ClassDecorator;
}


/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect
 */
export const Aspect: IAspectDecorator = createClassDecorator<AspectMetadata>('Aspect',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.annotation = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isArray(arg) || isClass(arg)) {
                ctx.metadata.within = arg;
                ctx.next(next);
            }
        }
    ], true) as IAspectDecorator;

