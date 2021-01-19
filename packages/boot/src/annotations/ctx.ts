import {
    isToken, lang, Token, INJECTOR, PROVIDERS, refl, TypeReflect, Type, Inject, Abstract, IContainer,
    IProvider, SymbolType, ProviderType, isInjector, isArray, isBoolean, Provider, Injector, IInjector, isProvide
} from '@tsdi/ioc';
import { AnnoationOption, IAnnoationContext, IDestroyableContext, ProdverOption } from '../Context';
import { CTX_OPTIONS } from '../tk';


/**
 * Destroyable context.
 */
@Abstract()
export class DestroyableContext<T extends ProdverOption> implements IDestroyableContext<T> {

    static ρNPT = true;
    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    private context: IProvider;
    protected options: T;

    constructor(@Inject() injector: Injector, @Inject(CTX_OPTIONS) options: T) {
        this.context = injector.getContainer().get(PROVIDERS);
        this.context.setValue(INJECTOR, injector);
        this.setOptions(options);
    }

    /**
     * raise injector of this context.
     */
    get injector(): IInjector {
        return this.context.getValue(INJECTOR);
    }

    /**
     * get providers of options.
     */
    get providers(): IProvider {
        if (!this.context.hasValue(Provider)) {
            this.context.setValue(Provider, this.injector.getContainer().getInstance(PROVIDERS))
        }
        return this.context.getValue(Provider);
    }

    /**
     * has register in context or not.
     * @param token
     */
    has(token: Token): boolean {
        return this.context.has(token);
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
     */
    get<T>(token: Token<T>): T {
        return this.context.get(token);
    }

    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: Token<T>): T {
        return this.context.getValue(key);
    }

    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: Token<T>, value: T) {
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
    protected setOptions(options: T): this {
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
                this.setValue(Provider, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
        this.options = lang.omit(options, 'contexts', 'providers', 'injector');
        return this;
    }

    /**
     * get options of context.
     *
     * @returns {T}
     */
    getOptions(): T {
        return this.options;
    }

    clone(): this;
    clone(options: T): this;
    /**
     * clone contexts.
     */
    clone(options?: T | boolean): this {
        const Ctx = lang.getClass(this);
        if (isBoolean(options)) {
            return options ? new Ctx(null, this.injector)
                : new Ctx(this.getOptions(), this.injector);
        } else {
            return new Ctx({ ...this.getOptions(), contexts: this.context.clone(), ...options || {} }, this.injector);
        }
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = [];
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }

    protected destroying() {
        this.context.destroy();
        this.options = null;
        this.context = null;
    }
}

/**
 * annoation context.
 */
@Abstract()
export class AnnoationContext<T extends AnnoationOption, TRefl extends TypeReflect = TypeReflect> extends DestroyableContext<T> implements IAnnoationContext<T> {


    private _type: Type;
    get type() {
        return this._type;
    }

    private _reflect: TRefl;
    get reflect(): TRefl {
        return this._reflect;
    }

    /**
     * set options for context.
     * @param options options.
     */
    protected setOptions(options: T): this {
        if (!options) {
            return;
        }

        if (options.type) {
            this._type = isProvide(options.type) ? this.injector.getTokenProvider(options.type) : options.type;
            if (!this._type) console.log('options.type', options.type);
            this._reflect = refl.get(this._type);
        }

        return super.setOptions(options);
    }
}
