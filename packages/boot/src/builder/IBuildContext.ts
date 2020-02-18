import { IHandleContext } from '../handles/Handle';
import { IBuildOption } from './IBuildOption';
import { IAnnotationMetadata, IAnnoationReflect } from '../annotations/IAnnoationReflect';
import { IAnnoationContext } from '../AnnoationContext';


/**
 * build context.
 *
 * @export
 * @interface IBuildContext
 * @extends {IHandleContext}
 */
export interface IBuildContext<
    T extends IBuildOption = IBuildOption,
    TMeta extends IAnnotationMetadata = IAnnotationMetadata,
    TRefl extends IAnnoationReflect = IAnnoationReflect> extends IAnnoationContext<T, TMeta, TRefl>, IHandleContext {

    /**
     * build instance.
     */
    value?: any;

    /**
     * current type attr data to binding.
     */
    getTemplate<T = any>(): T;
}
