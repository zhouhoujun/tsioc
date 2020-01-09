import { Injectable, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from './ComponentContext';
import { AnnoationContext } from '../AnnoationContext';
import { IBuildOption } from './IBuildOption';

@Injectable
export class BuildContext<T extends IBuildOption = IBuildOption> extends AnnoationContext<T> implements IComponentContext {
    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    target: any;

    static parse(injector: ICoreInjector, options: IBuildOption): BuildContext {
        return createRaiseContext(injector, BuildContext, options);
    }
}
