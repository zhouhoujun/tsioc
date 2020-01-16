import { Injectable, Type, InjectToken, createRaiseContext, isArray, lang, DecoratorProvider } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from '@tsdi/boot';
import { ITemplateOption } from '../IComponentBuilder';
import { ComponentContext } from './ComponentContext';
import { CTX_TEMPLATE_REF, ContextNode, CTX_COMPONENT_DECTOR } from '../ComponentRef';
import { ComponentProvider } from '../ComponentProvider';


/**
 * Template option token.
 */
export const TemplateOptionToken = new InjectToken<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');

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
        if (this.value && !this.has(CTX_TEMPLATE_REF)) {
            let decor: string;
            if (!this.componentDecorator) {
                let node = (isArray(this.value) ? lang.first(this.value) : this.value) as ContextNode;
                decor = (node.context as ComponentContext)?.componentDecorator;
                decor && this.set(CTX_COMPONENT_DECTOR, decor);
            } else {
                decor = this.componentDecorator;
            }
            let refSeltor = this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(decor, ComponentProvider);
            let tempRef = isArray(this.value) ? refSeltor.createTemplateRef(this, ...this.value) : refSeltor.createTemplateRef(this, this.value);
            this.set(CTX_TEMPLATE_REF, tempRef);
        }
        return this.get(CTX_TEMPLATE_REF) ?? this.value;
    }

    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
