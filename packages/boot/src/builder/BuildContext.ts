import { Injectable, createRaiseContext, IInjector } from '@tsdi/ioc';
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

    static parse(injector: IInjector, options: IBuildOption): BuildContext {
        return createRaiseContext(injector, BuildContext, options);
    }
}
