import { Injectable, createRaiseContext, ContainerFactory } from '@tsdi/ioc';
import { AnnoationOption, AnnoationContext } from '../../core';
import { IComponentContext } from '../ComponentContext';
import { IContainer } from '@tsdi/core';

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


    static parse(options: IModuleResolveOption, containerFactory: ContainerFactory<IContainer>): BuildContext {
        return createRaiseContext(BuildContext, options, containerFactory);
    }
}
