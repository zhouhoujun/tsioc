import { Injectable, createRaiseContext, lang, Type } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from './ComponentContext';
import { AnnoationContext } from '../AnnoationContext';
import { IBuildOption } from './IBuildOption';
import { CTX_TEMPLATE } from '../context-tokens';
import { IAnnoationReflect, IAnnotationMetadata } from '../annotations/IAnnoationReflect';

@Injectable
export class BuildContext<
    T extends IBuildOption = IBuildOption,
    TMeta extends IAnnotationMetadata = IAnnotationMetadata,
    TRefl extends IAnnoationReflect = IAnnoationReflect>
    extends AnnoationContext<T, TMeta, TRefl> implements IComponentContext {
    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    value: any;

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
