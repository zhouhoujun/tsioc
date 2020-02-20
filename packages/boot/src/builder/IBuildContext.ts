import { IHandleContext } from '../handles/Handle';
import { IBuildOption } from './IBuildOption';
import { IAnnoationContext } from '../AnnoationContext';


/**
 * build context.
 *
 * @export
 * @interface IBuildContext
 * @extends {IHandleContext}
 */
export interface IBuildContext<T extends IBuildOption = IBuildOption> extends IAnnoationContext<T>, IHandleContext {

    /**
     * build instance.
     */
    value?: any;

    /**
     * current type attr data to binding.
     */
    getTemplate<T = any>(): T;
}
