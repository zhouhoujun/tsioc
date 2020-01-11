import { Injectable, createRaiseContext, lang, Type } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ModuleConfigure } from '../modules/ModuleConfigure';
import { IComponentContext } from './ComponentContext';
import { AnnoationContext } from '../AnnoationContext';
import { IBuildOption } from './IBuildOption';
import { CTX_TEMPLATE } from '../context-tokens';

@Injectable
export class BuildContext<T extends IBuildOption = IBuildOption, TMeta extends ModuleConfigure = ModuleConfigure> extends AnnoationContext<T, TMeta> implements IComponentContext {
    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    value: any;

    protected tryGetCurrType(): Type {
        return this.value ? lang.getClass(this.value) : null;
    }

    /**
     * get template.
     */
    get template(): any {
        return this.get(CTX_TEMPLATE);
    }

    static parse(injector: ICoreInjector, options: IBuildOption): BuildContext {
        return createRaiseContext(injector, BuildContext, options);
    }

    setOptions(options: T) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.template) {
            this.set(CTX_TEMPLATE, options.template);
        }
    }
}
