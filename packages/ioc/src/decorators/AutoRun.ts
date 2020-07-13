import { IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator } from '../factories/DecoratorFactory';
import { isString, isNumber } from '../utils/lang';
import { AutorunMetadata } from '../metadatas/AutorunMetadata';


/**
 * autorun decorator inteface
 *
 * @export
 * @interface IAutorunDecorator
 * @extends {IClassMethodDecorator<AutorunMetadata>}
 */
export interface IAutorunDecorator extends IClassMethodDecorator<AutorunMetadata> {
    /**
     * Autorun decorator, for class.  use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (autorun: string): ClassDecorator;

    /**
     * Autorun decorator, for method.  use to define the method auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (order: number): MethodDecorator;

    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata?: AutorunMetadata): ClassMethodDecorator;
}

/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export const Autorun: IAutorunDecorator = createClassMethodDecorator<AutorunMetadata>('Autorun', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg) || isNumber(arg)) {
            if (isString(arg)) {
                ctx.metadata.autorun = arg;
                ctx.next(next);
            } else {
                ctx.metadata.order = arg;
                ctx.next(next);
            }
        }
    }
], (metadata) => {
    metadata.singleton = true;
    return metadata;
}) as IAutorunDecorator;
