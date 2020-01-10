import { ICoreInjector } from '@tsdi/core';
import { AnnoationOption } from '../AnnoationContext';


/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface IBuildOption<T = any> extends AnnoationOption<T> {

    template?: any;

    parsing?: boolean;

    /**
     * module reslove in the injector.
     */
    injector?: ICoreInjector;
}
