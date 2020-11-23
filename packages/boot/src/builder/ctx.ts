import { Injectable } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBuildContext, IBuildOption } from '../Context';
import { AnnoationContext, createContext } from '../annotations/ctx';
import { CTX_TEMPLATE, CTX_ELEMENT_NAME } from '../tk';

@Injectable
export class BuildContext<T extends IBuildOption = IBuildOption> extends AnnoationContext<T> implements IBuildContext<T> {
    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    value: any;

    /**
     * current type attr data to binding.
     */
    getTemplate<T = any>(): T {
        return this.context.getValue(CTX_TEMPLATE);
    }

    static parse(injector: ICoreInjector, options: IBuildOption): BuildContext {
        return createContext(injector, BuildContext, options);
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.name) {
            this.setValue(CTX_ELEMENT_NAME, options.name)
        }
        if (options.template) {
            this.setValue(CTX_TEMPLATE, options.template);
        }
        return super.setOptions(options);
    }
}
