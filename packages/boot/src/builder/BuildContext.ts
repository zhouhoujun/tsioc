import { Injectable, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from './ComponentContext';
import { AnnoationContext } from '../AnnoationContext';
import { IBuildOption } from './IBuildOption';
import { CTX_TEMPLATE, CTX_ELEMENT_NAME } from '../context-tokens';
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
        return this.getValue(CTX_TEMPLATE);
    }

    static parse(injector: ICoreInjector, options: IBuildOption): BuildContext {
        return createRaiseContext(injector, BuildContext, options);
    }

    setOptions(options: T) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.name) {
            this.setValue(CTX_ELEMENT_NAME, options.name)
        }
        if (options.template) {
            this.setValue(CTX_TEMPLATE, options.template);
        }
    }
}
