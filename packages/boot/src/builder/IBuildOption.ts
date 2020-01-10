import { ICoreInjector } from '@tsdi/core';
import { AnnoationOption, AnnoationContext } from '../AnnoationContext';


/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface IBuildOption<T = any> extends AnnoationOption<T> {
    /**
     * component scope.
     *
     * @type {*}
     * @memberof BootOption
     */
    scope?: any;

    parent?: AnnoationContext;

    template?: any;

    parsing?: boolean;

    /**
     * module reslove in the injector.
     */
    injector?: ICoreInjector;

}
