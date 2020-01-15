import { Abstract, Type, isString, Inject, lang, TypeReflectsToken, ITypeReflects, SymbolType, isClass, IInjector, Token, INJECTOR, DECORATOR, DecoratorProvider } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import { COMPONENT_REFS, ComponentRef, ElementRef, TemplateRef, ELEMENT_REFS } from './ComponentRef';
import { IComponentReflect } from './IComponentReflect';
import { IPipeTransform } from './bindings/IPipeTransform';
import { AstResolver } from './AstResolver';


const attrSelPrefix = /^ATTR__/;
const seletPrefix = /^SELTR_/;
const pipePrefix = /^PIPE_/;
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

    autoCreateElementRef = false;

    createNodeSelector(element): NodeSelector {
        return this.reflects.get(lang.getClass(element))
            ?.getInjector()
            ?.get(COMPONENT_REFS)
            ?.get(element)
            ?.getNodeSelector();
    }

    private ast: AstResolver;
    getAstResolver(): AstResolver {
        if (!this.ast) {
            this.ast = this.reflects.getActionInjector().get(DecoratorProvider)
                .resolve(this.dectorator, AstResolver) ?? this.reflects.getContainer().get(AstResolver);
        }
        return this.ast;
    }

    createComponentRef(type: Type, target: Object, context: AnnoationContext, ...nodes: any[]): ComponentRef<any, any> {
        return new ComponentRef(type, target, context, this.createTemplateRef(context, ...nodes));
    }

    createTemplateRef(context: AnnoationContext, ...nodes: any[]): TemplateRef<any> {
        return new TemplateRef(context, nodes);
    }

    createElementRef(context: AnnoationContext, target: any): ElementRef<any> {
        return new ElementRef(context, target);
    }

    getPipe<T extends IPipeTransform>(token: Token<T>, injector: IInjector): T {
        if (isString(token)) {
            token = this.toPipeToken(token) ?? token;
        }
        return injector.get(token);
    }

    getElementRef(target: any, injector?: IInjector): ElementRef<any> {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector();
        return injector.get(ELEMENT_REFS)?.get(target);
    }

    getComponentRef<T>(target: T, injector?: IInjector): ComponentRef<T> {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector();
        return injector.get(COMPONENT_REFS)?.get(target);
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
        return isClass(element) && this.reflects.get<IComponentReflect>(element).component;
    }

    abstract isElementType(element: any): boolean;

}

