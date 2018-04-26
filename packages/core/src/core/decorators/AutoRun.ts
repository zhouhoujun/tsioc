import { IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator } from '../factories/index';
import { AutorunMetadata } from '../metadatas/index';
import { isClassMetadata, isString } from '../../utils/index';
import { Type } from '../../types';


/**
 * autorun decorator inteface
 *
 * @export
 * @interface IAutorunDecorator
 * @extends {IClassMethodDecorator<AutorunMetadata>}
 */
export interface IAutorunDecorator extends IClassMethodDecorator<AutorunMetadata> {
    /**
     * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
     * @Autorun
     * 
     * @param {string} [autorun] the special method name when define to class. 
     */
    (autorun?: string): ClassMethodDecorator;

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
export const Autorun: IAutorunDecorator = createClassMethodDecorator<AutorunMetadata>('Autorun', args => {
    args.next<AutorunMetadata>({
        isMetadata: (arg) => isClassMetadata(arg, ['autorun']),
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.autorun = arg;
        }
    });
}) as IAutorunDecorator;
