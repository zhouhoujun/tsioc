import { Injectable, Type, createRaiseContext, isArray, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ComponentContext, IComponentContext, IComponentOption } from '../ComponentContext';
import { CTX_TEMPLATE_REF, ITemplateRef } from '../ComponentRef';



/**
 * template option.
 *
 * @export
 * @interface ITemplateOption
 * @extends {IBuildOption}
 */
export interface ITemplateOption extends IComponentOption {
    selector?: Type;
    tempRef?: boolean;
}

/**
 * Template option token.
 */
export const TemplateOptionToken = tokenId<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');


export interface ITemplateContext<T extends ITemplateOption = ITemplateOption> extends IComponentContext<T> {
    selector?: Type;
    getResultRef(): ITemplateRef;
}

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
                    ctx.setParent(this.getParent());
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
