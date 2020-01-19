import { Injectable, Type, createRaiseContext, isArray, lang, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from '@tsdi/boot';
import { ITemplateOption } from '../IComponentBuilder';
import { ComponentContext } from './ComponentContext';
import { CTX_TEMPLATE_REF, ContextNode, CTX_COMPONENT_DECTOR } from '../ComponentRef';


/**
 * Template option token.
 */
export const TemplateOptionToken = tokenId<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');

/**
 * template context.
 *
 * @export
 * @class TemplateContext
 * @extends {IocRaiseContext<IContainer>}
 * @implements {IComponentContext}
 */
@Injectable
export class TemplateContext extends ComponentContext<ITemplateOption> implements IComponentContext {

    selector?: Type;

    getResultRef() {
        if (this.value && !this.hasValue(CTX_TEMPLATE_REF)) {
            if (!this.componentDecorator) {
                let node = (isArray(this.value) ? lang.first(this.value) : this.value) as ContextNode;
                let decor = (node.context as ComponentContext)?.componentDecorator;
                decor && this.setValue(CTX_COMPONENT_DECTOR, decor);
            }
            let compPdr = this.componentProvider;
            if (compPdr) {
                let tempRef = isArray(this.value) ? compPdr.createTemplateRef(this, ...this.value) : compPdr.createTemplateRef(this, this.value);
                this.setValue(CTX_TEMPLATE_REF, tempRef);
            }
        }
        return this.getValue(CTX_TEMPLATE_REF) ?? this.value;
    }

    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
