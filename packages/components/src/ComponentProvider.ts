import { Abstract, Type, isString, Inject, lang, TypeReflectsToken, ITypeReflects, SymbolType, isClass, IInjector, Token, DECORATOR, DecoratorProvider, tokenId, isMetadataObject } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import { COMPONENT_REFS, ComponentRef, ElementRef, TemplateRef, ELEMENT_REFS, IComponentRef, ITemplateRef, IElementRef } from './ComponentRef';
import { IComponentReflect } from './IComponentReflect';
import { IPipeTransform } from './bindings/IPipeTransform';
import { AstResolver } from './AstResolver';



const attrSelPrefix = /^ATTR__/;
const seletPrefix = /^SELTR_/;
const pipePrefix = /^PIPE_/;


export const CTX_COMPONENT_PROVIDER = tokenId<ComponentProvider>('CTX_COMPONENT_PROVIDER');
/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class ComponentProvider {

    constructor(@Inject(DECORATOR) protected dectorator: string) {

    }

    @Inject(TypeReflectsToken) reflects: ITypeReflects;

    abstract getSelectorKey(): string;

    abstract getRefSelectKey(): string;

    abstract getDefaultCompose(): Type;

    parseElementRef = false;

    createNodeSelector(element): NodeSelector {
        return this.reflects.get(lang.getClass(element))
            ?.getInjector()
            ?.getSingleton(COMPONENT_REFS)
            ?.get(element)
            ?.getNodeSelector();
    }

    private ast: AstResolver;
    getAstResolver(): AstResolver {
        if (!this.ast) {
            this.ast = this.reflects.getActionInjector().getInstance(DecoratorProvider)
                .resolve(this.dectorator, AstResolver) ?? this.reflects.getContainer().getInstance(AstResolver);
        }
        return this.ast;
    }

    isTemplate(target): boolean {
        return isMetadataObject(target, this.getSelectorKey());
    }

    createComponentRef<T>(type: Type<T>, target: T, context: AnnoationContext, ...nodes: any[]): IComponentRef<T, any> {
        return new ComponentRef(type, target, context, this.createTemplateRef(context, ...nodes));
    }

    createTemplateRef(context: AnnoationContext, ...nodes: any[]): ITemplateRef {
        return new TemplateRef(context, nodes);
    }

    createElementRef(context: AnnoationContext, target: any): IElementRef {
        return new ElementRef(context, target);
    }

    getElementRef(target: any, injector?: ICoreInjector): IElementRef {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector() as ICoreInjector;
        return injector.getSingleton(ELEMENT_REFS)?.get(target);
    }

    getComponentRef<T>(target: T, injector?: ICoreInjector): IComponentRef<T, any> {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector() as ICoreInjector;
        return injector.getSingleton(COMPONENT_REFS)?.get(target);
    }

    getPipe<T extends IPipeTransform>(token: Token<T>, injector: ICoreInjector): T {
        if (isString(token)) {
            token = this.toPipeToken(token) ?? token;
        }
        return injector.get(token);
    }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `SELTR_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ATTR_${selector}`;
    }

    toPipeToken(name: string): SymbolType {
        return pipePrefix.test(name) ? name : `PIPE_${name}`;
    }


    /**
     * select ref tag in element.
     *
     * @param {*} element
     * @param {(string | ((e: any) => boolean))} selector
     * @returns {*}
     * @memberof RefSelector
     */
    select(element: any, selector: string | ((e: any) => boolean)): any {
        let selFunc: (e: any) => boolean;
        if (isString(selector)) {
            let id = this.getRefSelectKey();
            selFunc = e => e[id] === selector;
        } else {
            selFunc = selector;
        }
        let cmpSelector = element instanceof ComponentRef ? element.getNodeSelector() : this.createNodeSelector(element);
        if (cmpSelector) {
            return cmpSelector.find(e => selFunc(e));
        }
        return null;
    }

    isNodeType(element: any): boolean {
        return this.isComponentType(element) || this.isElementType(element);
    }

    isComponentType(element: any): boolean {
        return isClass(element) && this.reflects.get<IComponentReflect>(element)?.component;
    }

    abstract isElementType(element: any): boolean;

}

