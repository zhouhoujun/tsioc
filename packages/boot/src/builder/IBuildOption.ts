import { ObjectMap } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnoationOption } from '../AnnoationContext';


export type Template = string | ObjectMap<any>;

/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface IBuildOption<T = any> extends AnnoationOption<T> {
    /**
     * name of component.
     */
    name?: string;
    /**
     * template to binding.
     */
    template?: Template;

    /**
     * module reslove in the injector.
     */
    injector?: ICoreInjector;
}
