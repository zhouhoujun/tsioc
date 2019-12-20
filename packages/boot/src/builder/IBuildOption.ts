import { IInjector } from '@tsdi/ioc';
import { AnnoationOption } from '../AnnoationContext';

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

    template?: any;

    parsing?: boolean;

    /**
     * module reslove in the injector.
     */
    injector?: IInjector;

}
