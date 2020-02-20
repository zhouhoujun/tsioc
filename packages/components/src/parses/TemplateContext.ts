import { Injectable, Type, createRaiseContext, isArray } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ComponentContext  } from '../ComponentContext';
import { CTX_TEMPLATE_REF } from '../ComponentRef';
import { ITemplateOption, ITemplateContext } from './ITemplateContext';



/**
 * template context.
 *
 * @export
 * @class TemplateContext
 * @extends {IocRaiseContext<IContainer>}
 * @implements {IComponentContext}
 */
@Injectable
export class TemplateContext extends ComponentContext<ITemplateOption> implements ITemplateContext<ITemplateOption> {

    selector?: Type;

    getResultRef() {
        if (this.value && !this.hasValue(CTX_TEMPLATE_REF)) {
            let compPdr = this.componentProvider;
            if (compPdr) {
                let ctx: ITemplateContext;
                if (compPdr.isTemplateContext(this)) {
                    ctx = this;
                } else {
                    ctx = compPdr.createTemplateContext(this.injector);
                    ctx.context.copy(this.context);
                }
                let tempRef = isArray(this.value) ? compPdr.createTemplateRef(ctx, ...this.value) : compPdr.createTemplateRef(ctx, this.value);
                this.setValue(CTX_TEMPLATE_REF, tempRef);
            }
        }
        return this.context.getValue(CTX_TEMPLATE_REF) ?? this.value;
    }

    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
