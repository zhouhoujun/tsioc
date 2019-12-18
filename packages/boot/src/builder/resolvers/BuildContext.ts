import { Injectable, createRaiseContext, IInjector } from '@tsdi/ioc';
import { IComponentContext } from '../ComponentContext';
import { AnnoationOption, AnnoationContext } from '../../AnnoationContext';

/**
 * module resolve option.
 *
 * @export
 * @interface IModuleResolveOption
 */
export interface IModuleResolveOption extends AnnoationOption {

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

@Injectable
export class BuildContext<T extends IModuleResolveOption = IModuleResolveOption> extends AnnoationContext<T> implements IComponentContext {
    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    target: any;


    static parse(injector: IInjector, options: IModuleResolveOption): BuildContext {
        return createRaiseContext(BuildContext, options, injector);
    }
}
