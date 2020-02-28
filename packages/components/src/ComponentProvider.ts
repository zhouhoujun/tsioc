import {
    Abstract, Type, isString, Inject, lang, TypeReflectsToken, ITypeReflects, IProviders,
    SymbolType, isClass, Token, DECORATOR, DecoratorProvider, tokenId, isMetadataObject, ClassType, Injectable
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IAnnoationContext } from '@tsdi/boot';
import {
    COMPONENT_REFS, ELEMENT_REFS, IComponentRef, ITemplateRef, IElementRef,
    TEMPLATE_REF, CONTEXT_REF, ROOT_NODES, NATIVE_ELEMENT, COMPONENT_REF, COMPONENT_INST,
    COMPONENT_TYPE, ELEMENT_REF, NodeSelector
} from './ComponentRef';
import { IComponentReflect } from './IComponentReflect';
import { IPipeTransform } from './bindings/IPipeTransform';
import { IComponentContext } from './ComponentContext';
import { ITemplateContext, ITemplateOption } from './parses/TemplateContext';
import { pipeExp } from './bindings/exps';





const attrSelPrefix = /^ATTR__/;
const seletPrefix = /^SELTR_/;
// const pipePrefix = /^PIPE_/;

export interface BindFunc extends Function {
    __binded?: boolean;
}

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

    /**
     * parse element, template as ref or not.
     */
    parseRef = false;

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

    abstract isTemplateContext(context: IAnnoationContext): boolean;

    abstract createTemplateContext(injector: ICoreInjector, options?: ITemplateOption): ITemplateContext;

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
     * bind function context.
     * @param func func
     * @param ctx context to bind.
     */
    bindContext(func: Function, ctx: IComponentContext): BindFunc {
        let bindFunc = func as BindFunc;
        if (!bindFunc.__binded) {
            bindFunc = (...args) => func(...args, ctx);
            bindFunc.__binded = true;
        }
        return bindFunc;
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


@Injectable()
export class AstResolver {

    constructor(protected provider: ComponentProvider) {
    }

    /**
     * resolve expression.
     *
     * @param {string} expression
     * @param {ICoreInjector} [injector]
     * @param {*} [envOptions]
     * @returns {*}
     * @memberof AstResolver
     */
    resolve(expression: string, injector: ICoreInjector, envOptions?: any): any {
        if (!expression) {
            return expression;
        }

        try {
            // xxx | pipename
            let pipeTransf: IPipeTransform;
            if (pipeExp.test(expression)) {
                let idex = expression.lastIndexOf(' | ');
                let pipename = expression.substring(idex + 3);
                if (pipename) {
                    pipeTransf = this.provider.getPipe(pipename, injector);
                }
                expression = expression.substring(0, idex);
            }
            let value;
            if (envOptions) {
                // tslint:disable-next-line:no-eval
                let func = eval(`(${Object.keys(envOptions).join(',')}) => {
                    return ${expression};
                }`);
                value = func(...Object.values(envOptions));

            } else {
                // tslint:disable-next-line:no-eval
                value = eval(expression);
            }
            return pipeTransf ? pipeTransf.transform(value) : value;
        } catch (err) {
            return void 0;
        }
    }
}

