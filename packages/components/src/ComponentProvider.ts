import {
    Abstract, Type, isString, Inject, lang, TypeReflectsToken, ITypeReflects, IProviders,
    SymbolType, isClass, Token, DECORATOR, DecoratorProvider, tokenId, isMetadataObject,
    ClassType, Injectable, isTypeObject, isFunction, isDefined
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
import { ITemplateContext, ITemplateOption } from './compile/TemplateContext';
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
     * @param {Object | Map<string, any>} [scope]
     * @param {*} [envOptions]
     * @returns {*}
     * @memberof AstResolver
     */
    resolve(expression: string, injector: ICoreInjector, scope?: Object | Map<string, any>, envOptions?: any): any {
        if (!expression) {
            return expression;
        }
        try {
            // xxx | pipename
            let pipes: string[];
            let map = this.parseScope(expression, scope, envOptions);
            let idx = expression.search(pipeExp);
            if (idx > 0) {
                pipes = expression.substring(idx + 3).split(' | ');
                expression = expression.substring(0, idx);
            }
            let value = this.eval(expression, map);
            if (pipes && pipes.length) {
                let scopes = Array.from(map.keys());
                let args = Array.from(map.values());
                this.transforms(pipes, injector, scopes)
                    .forEach(tsf => {
                        value = tsf(value, args, envOptions);
                    });
            }
            return value;
        } catch (err) {
            return void 0;
        }
    }

    parse(expression: string, injector: ICoreInjector): (scope: Map<string, any>, envOptions?: any) => any {
        if (!expression) {
            return null;
        }
        let self = this;
        return (() => {
            let pipes: string[];
            let map: Map<string, any>;
            let scopes: string[];
            let transforms: ((value, args: any[], envOptions?: any) => any)[];
            let expFunc: (...args: any[]) => any;
            return (scope: Map<string, any>, envOptions?: any) => {
                try {
                    // xxx | pipename
                    if (!map || !expFunc) {
                        map = self.parseScope(expression, scope, envOptions);
                        scopes = Array.from(map.keys());
                        let idx = expression.search(pipeExp);
                        if (idx > 0) {
                            pipes = expression.substring(idx + 3).split(' | ');
                            expression = expression.substring(0, idx);
                        }
                        if (pipes) {
                            transforms = this.transforms(pipes, injector, scopes);
                        }
                        expFunc = this.toScopFunc(expression, scopes);
                    }
                    let args = Array.from(scope.values());
                    let value = expFunc(...args);
                    if (transforms && transforms.length) {
                        transforms.forEach(tsf => {
                            value = tsf(value, args, envOptions);
                        });
                    }
                    return value;
                } catch (err) {
                    return void 0;
                }
            }
        })();
    }

    parseScope(expression: string, scope?: Object | Map<string, any>, envOptions?: Object): Map<string, any> {
        if (scope) {
            if (scope instanceof Map) {
                return scope;
            }
            const map = new Map<string, any>();
            Object.keys(scope).forEach(k => {
                if (expression.indexOf(k) >= 0) {
                    map.set(k, scope[k]);
                }
            });
            if (isTypeObject(scope)) {
                let descps = this.provider.reflects.create(lang.getClass(scope)).defines.getPropertyDescriptors();
                Object.keys(descps).forEach(k => {
                    if (k === 'constructor' || expression.indexOf(k) < 0) {
                        return;
                    }
                    let val: any;
                    let de = descps[k];
                    if (isFunction(de.value)) {
                        val = (...args) => scope[k](...args);
                    } else {
                        val = scope[k];
                    }
                    if (isDefined(val)) {
                        map.set(k, val);
                    }
                });
            }
            if (envOptions) {
                Object.keys(envOptions).forEach(k => {
                    if (expression.indexOf(k) >= 0) {
                        map.set(k, envOptions[k]);
                    }
                })
            }
            return map;
        }
        return null;
    }

    eval(expression: string, scopes?: Map<string, any>) {
        if (scopes) {
            let func = this.toScopFunc(expression, Array.from(scopes.keys()));
            return func(...Array.from(scopes.values()));
        } else {
            return this.toScopFunc(expression, [])();
        }
    }

    toScopFunc(expression: string, scopes: string[]) {
        return new Function(...scopes, `return ${expression}`) as (...args) => any;
        // // tslint:disable-next-line:no-eval
        // return eval(`(${scopes.join(',')}) => {
        //         return ${expression};
        //     }`);
    }

    protected transforms(pipes: string[], injector: ICoreInjector, scopes: string[]): ((value, args: any[], envOptions?: any) => any)[] {
        return pipes.map(p => {
            let [pipeName, args] = p.split(':');
            let pipe = this.provider.getPipe(pipeName, injector);
            let pipeAg: Function;
            let isArray: boolean;
            if (args) {
                if (args.indexOf(',') > 0) {
                    pipeAg = this.toScopFunc(`[${args}]`, scopes);
                    isArray = true;
                } else {
                    pipeAg = this.toScopFunc(args, scopes);
                }
            }

            return pipeAg ? (value, args: any[], envOptions?: any) => pipe.transform(value, ...(isArray ? pipeAg(...args) : [pipeAg(...args)]), envOptions)
                : (value, args: any[], envOptions?: any) => pipe.transform(value, envOptions)
        });
    }
}

