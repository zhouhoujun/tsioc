import {
    Type, isDefined, isToken, ClassType, lang, Token, IInjector, Inject, INJECTOR, IProvider, Destoryable,
    PROVIDERS, ITypeReflects, TypeReflectsToken, SymbolType, ProviderType, isInjector, isArray, isBoolean, IContainer, getTokenKey
} from '@tsdi/ioc';
import {
    CTX_MODULE_ANNOATION, CTX_MODULE, CTX_MODULE_DECTOR, CTX_PARENT_CONTEXT, CTX_SUB_CONTEXT,
    CTX_OPTIONS, CTX_TARGET_RELF, CTX_PROVIDERS
} from '../tk';
import { ModuleRef } from '../modules/ModuleRef';
import { IAnnotationMetadata, IAnnoationReflect } from './reflect';
import { AnnoationOption, IAnnoationContext, ProdverOption } from '../Context';

/**
 * context factory.
 * @param injector
 * @param CtxType
 * @param option
 */
export function createContext<Ctx extends IAnnoationContext>(injector: IInjector, CtxType: Type<Ctx>, options: AnnoationOption): Ctx {
    let ctx = new CtxType(injector);
    options && ctx.setOptions(options);
    return ctx;
}

export class DestoryableContext<T extends ProdverOption> extends Destoryable {
    public context: IProvider;

    constructor(@Inject(INJECTOR) injector: IInjector) {
        super();
        this.context = injector.get(PROVIDERS);
        this.context.setValue(INJECTOR, injector);
    }

    /**
     * raise injector of this context.
     */
    get injector(): IInjector {
        return this.context.getValue(INJECTOR) as IInjector;
    }

    /**
     * get type reflects.
     */
    get reflects(): ITypeReflects {
        return this.context.getValue(TypeReflectsToken) ?? this.getReflects();
    }

    protected getReflects() {
        let reflects = this.injector.getInstance(TypeReflectsToken);
        this.context.setValue(TypeReflectsToken, reflects);
        return reflects;
    }

    /**
     * get providers of options.
     */
    get providers(): IProvider {
        return this.context.getValue(CTX_PROVIDERS) ?? this.getProviders();
    }

    private _originPdr: boolean;
    protected getProviders() {
        this._originPdr = true;
        let providers = this.injector.get(PROVIDERS);
        this.setValue(CTX_PROVIDERS, providers);
        return providers;
    }

    /**
     * has register in context or not.
     * @param token
     */
    has(token: Token): boolean {
        return this.context.hasRegister(token);
    }

    /**
     * has value in context or not.
     * @param token
     */
    hasValue(token: SymbolType): boolean {
        return this.context.hasValue(token);
    }

    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: SymbolType[]) {
        tokens.forEach(tk => {
            this.context.delValue(tk);
        });
    }
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof BootContext
     */
    get<T>(token: Token<T>): T {
        return this.context.get(token);
    }

    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof BootContext
     */
    getInstance<T>(token: SymbolType<T>): T {
        return this.context.getInstance(token);
    }

    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: SymbolType<T>): T {
        return this.context.getValue(key);
    }

    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: SymbolType<T>, value: T) {
        this.context.setValue(key, value);
        return this;
    }

    /**
     * set provider of this context.
     *
     * @param {Token} token context provider token.
     * @param {*} value context value.
     */
    set(token: Token, value: any);
    /**
     * set context provider of boot application.
     *
     * @param {...ProviderType[]} providers
     */
    set(...providers: ProviderType[]);
    set(...providers: any[]) {
        if (providers.length === 2 && isToken(providers[0])) {
            let provde = providers[0];
            let value = providers[1];
            this.context.setValue(provde, value);
        } else {
            this.context.inject(...providers);
        }
        return this;
    }

    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this.injector.getContainer();
    }

    /**
     * set options for context.
     * @param options options.
     */
    setOptions(options: T): this {
        if (!options) {
            return;
        }
        if (options.contexts) {
            if (isInjector(options.contexts)) {
                this.context.copy(options.contexts);
            } else if (isArray(options.contexts)) {
                this.context.inject(...options.contexts);
            }
        }
        if (options.providers) {
            if (isInjector(options.providers)) {
                this.setValue(CTX_PROVIDERS, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
        options = this.context.hasValue(CTX_OPTIONS) ? Object.assign(this.getOptions(), options) : options;
        this.context.setValue(CTX_OPTIONS, options);
        return this;
    }

    /**
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T {
        return this.context.getValue(CTX_OPTIONS) as T;
    }

    clone(): this;
    /**
     * clone the context.
     * @param empty empty context or not.
     */
    clone(empty: boolean): this;
    clone(options: T): this;
    /**
     * clone contexts.
     */
    clone(options?: T | boolean): this {
        if (isBoolean(options)) {
            return options ? createContext(this.injector, lang.getClass(this), null)
                : createContext(this.injector, lang.getClass(this), this.getOptions());
        } else {
            return createContext(this.injector, lang.getClass(this), { ...this.getOptions(), contexts: this.context.clone(), ...options || {} });
        }
    }

    protected destroying() {
        this.context.destroy();
        this.context = null;
    }
}


/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext<T extends AnnoationOption = AnnoationOption> extends DestoryableContext<T> implements IAnnoationContext<T> {

    static parse(injector: IInjector, target: ClassType | AnnoationOption): AnnoationContext {
        return createContext(injector, AnnoationContext, isToken(target) ? { type: target } : target);
    }

    get type(): Type {
        return this.context.getValue(CTX_MODULE);
    }

    /**
     * current annoation type decorator.
     *
     * @readonly
     * @type {string}
     * @memberof AnnoationContext
     */
    get decorator(): string {
        return this.context.getValue(CTX_MODULE_DECTOR) ?? this.getDecorator();
    }

    protected getDecorator() {
        let dec = this.type ? this.getTargetReflect()?.decorator : null;
        dec && this.setValue(CTX_MODULE_DECTOR, dec);
        return dec;
    }

    getModuleRef(): ModuleRef {
        return this.injector.getValue(ModuleRef);
    }

    getTargetReflect(): IAnnoationReflect {
        return this.context.getValue(CTX_TARGET_RELF) ?? this.getParentTargetReflect();
    }

    protected getParentTargetReflect(): IAnnoationReflect {
        let refl = this.type ? this.reflects.get(this.type) : null;
        refl && this.setValue(CTX_TARGET_RELF, refl);
        return refl
    }

    /**
     * get token providers service route in root contexts.
     * @param token
     */
    getContext<T>(token: Token<T>, success?: (value: T) => void): T {
        let key = getTokenKey(token);
        let value = this.getInstance(key);
        if (isDefined(value)) {
            success && success(value);
            return value;
        }
        let ctx = this.getParent() as IAnnoationContext;
        while (ctx && !ctx.destroyed) {
            value = ctx.getInstance(key);
            if (isDefined(value)) {
                success && success(value);
                break;
            }
            ctx = ctx.getParent();
        }
        return value ?? null;
    }

    /**
     * resolve token route in root contexts.
     * @param token
     */
    getContextValue<T>(token: Token<T>, success?: (value: T) => void): T {
        if (this.destroyed) {
            return null;
        }
        let key = getTokenKey(token);
        let value = this.context.getValue(key);
        if (isDefined(value)) {
            success && success(value);
            return value;
        }
        let ctx = this.getParent() as IAnnoationContext;
        while (ctx && !ctx.destroyed) {
            value = ctx.context.getValue(key);
            if (isDefined(value)) {
                success && success(value);
                break;
            }
            ctx = ctx.getParent();
        }
        return value ?? null;
    }

    setParent(context: IAnnoationContext): this {
        if (context === null) {
            this.remove(CTX_PARENT_CONTEXT);
        } else {
            this.setValue(CTX_PARENT_CONTEXT, context);
        }
        return this;
    }

    getParent<T extends IAnnoationContext>(): T {
        return this.context.getValue(CTX_PARENT_CONTEXT) as T;
    }

    addChild(contex: IAnnoationContext) {
        let chiledren = this.getChildren();
        chiledren.push(contex);
        this.setValue(CTX_SUB_CONTEXT, chiledren);
    }

    removeChild(contex: IAnnoationContext) {
        let chiledren = this.getChildren();
        if (chiledren) {
            return lang.del(chiledren, contex);
        }
        return [];
    }

    hasChildren() {
        return this.hasValue(CTX_SUB_CONTEXT);
    }

    getChildren<T extends IAnnoationContext>(): T[] {
        return (this.context.getValue(CTX_SUB_CONTEXT) || []) as T[];
    }


    /**
     * annoation metadata.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    getAnnoation(): IAnnotationMetadata {
        return this.context.getValue(CTX_MODULE_ANNOATION) ?? this.getReflAnnoation();
    }

    protected getReflAnnoation(): IAnnotationMetadata {
        let anno = this.type ? this.getTargetReflect()?.getAnnoation?.() : null;
        anno && this.setValue(CTX_MODULE_ANNOATION, anno);
        return anno;
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        options.type = options.type || options.module;
        if (options.type) {
            this.setValue(CTX_MODULE, options.type);
        }
        if (options.parent instanceof AnnoationContext) {
            this.setParent(options.parent);
        }
        return super.setOptions(options);
    }

}
