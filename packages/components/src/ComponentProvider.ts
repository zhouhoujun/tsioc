import {
    Abstract, Type, isString, Inject, lang, TypeReflectsToken, ITypeReflects, IProviders,
    SymbolType, isClass, Token, DECORATOR, DecoratorProvider, tokenId, isMetadataObject, ClassType
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IAnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import {
    COMPONENT_REFS, ELEMENT_REFS, IComponentRef, ITemplateRef, IElementRef,
    TEMPLATE_REF, CONTEXT_REF, ROOT_NODES, NATIVE_ELEMENT, COMPONENT_REF, COMPONENT_INST,
    COMPONENT_TYPE, ELEMENT_REF
} from './ComponentRef';
import { IComponentReflect } from './IComponentReflect';
import { IPipeTransform } from './bindings/IPipeTransform';
import { AstResolver } from './AstResolver';
import { TemplateContext, ITemplateContext, ITemplateOption } from './parses/TemplateContext';




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


    private providers: IProviders;
    getProviders(): IProviders {
        if (!this.providers) {
            this.providers = this.reflects.getActionInjector().get(DecoratorProvider).getProviders(this.dectorator);
        }
        return this.providers;
    }

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
            this.ast = this.getProviders().getInstance(AstResolver) ?? this.reflects.getContainer().getInstance(AstResolver);
        }
        return this.ast;
    }

    isTemplate(target): boolean {
        return isMetadataObject(target, this.getSelectorKey());
    }

    createComponentRef<T>(type: Type<T>, target: T, context: IAnnoationContext, ...nodes: any[]): IComponentRef<T, any> {
        return this.getProviders().getInstance(COMPONENT_REF,
            { provide: CONTEXT_REF, useValue: context },
            { provide: COMPONENT_TYPE, useValue: type },
            { provide: COMPONENT_INST, useValue: target },
            { provide: TEMPLATE_REF, useValue: this.createTemplateRef(context, ...nodes) });
    }

    isTemplateContext(context: IAnnoationContext): boolean {
        return context instanceof TemplateContext;
    }

    createTemplateContext(injector: ICoreInjector, options?: ITemplateOption): ITemplateContext {
        return TemplateContext.parse(injector, options);
    }

    createTemplateRef(context: IAnnoationContext, ...nodes: any[]): ITemplateRef {
        return this.getProviders().getInstance(TEMPLATE_REF,
            { provide: CONTEXT_REF, useValue: context },
            { provide: ROOT_NODES, useValue: nodes });
    }

    createElementRef(context: IAnnoationContext, target: any): IElementRef {
        return this.getProviders().getInstance(ELEMENT_REF,
            { provide: CONTEXT_REF, useValue: context },
            { provide: NATIVE_ELEMENT, useValue: target });
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
        return injector.get(token);
    }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `SELTR_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ATTR_${selector}`;
    }

    /**
     * bind function scope.
     * @param func func
     * @param scope scope to bind.
     */
    bindScope(func: Function, scope: any): Function {
        if (!func['__binded']) {
            func = func.bind ? func.bind(scope) :
                (...args) => func( ...args, scope);
            func['__binded'] = true;
        }
        return func;
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
            let idkey = this.getRefSelectKey();
            selFunc = e => this.match(e, selector, idkey);
        } else {
            selFunc = selector;
        }
        let cmpSelector = this.isComponentRef(element) ? element.getNodeSelector() : this.createNodeSelector(element);
        if (cmpSelector) {
            return cmpSelector.find(e => selFunc(e));
        }
        return null;
    }

    protected match(e: any, selector: string, idkey: string) {
        if (this.isComponentRef(e)) {
            return e.selector === selector;
        }
        return e[idkey] === selector;
    }

    abstract isElementRef(target: any): target is IElementRef;

    abstract isComponentRef(target: any): target is IComponentRef;

    abstract isElementRefType(target: ClassType): boolean;

    abstract isComponentRefType(target: ClassType): boolean;

    isNodeType(element: ClassType): boolean {
        return this.isComponentType(element) || this.isElementType(element);
    }

    isComponentType(element: ClassType): boolean {
        return isClass(element) && this.reflects.get<IComponentReflect>(element)?.component;
    }

    abstract isElementType(element: ClassType): boolean;

}

