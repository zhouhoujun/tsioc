import {
    isToken, lang, Token, INJECTOR, PROVIDERS, refl, TypeReflect, Type, Inject, Abstract,
    IProvider, Destoryable, SymbolType, Provider, isInjector, isArray, isBoolean, isClass
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { AnnoationOption, IAnnoationContext, IDesctoryableContext, ProdverOption } from '../Context';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../tk';


/**
 * annoation context.
 */
@Abstract()
export class DestoryableContext<T extends ProdverOption> extends Destoryable implements IDesctoryableContext<T> {

    static ρNPT = true;
    private context: IProvider;
    protected options: T;

    constructor(@Inject(INJECTOR) injector: ICoreInjector, @Inject(CTX_OPTIONS) options: T) {
        super();
        this.context = injector.get(PROVIDERS);
        this.setOptions(options);
        this.context.setValue(INJECTOR, injector);
    }

    /**
     * raise injector of this context.
     */
    get injector(): ICoreInjector {
        return this.context.getValue<ICoreInjector>(INJECTOR);
    }

    /**
     * get providers of options.
     */
    get providers(): IProvider {
        if (!this.context.hasValue(CTX_PROVIDERS)) {
            this.context.setValue(CTX_PROVIDERS, this.injector.getInstance(PROVIDERS))
        }
        return this.context.getValue(CTX_PROVIDERS);
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
     * @param {...Provider[]} providers
     */
    set(...providers: Provider[]);
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
                this.setValue(CTX_PROVIDERS, options.providers)
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
export class AnnoationContext<T extends AnnoationOption, TRefl extends TypeReflect = TypeReflect> extends DestoryableContext<T> implements IAnnoationContext<T> {


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
            this._type = isClass(options.type) ? options.type : this.injector.getTokenProvider(options.type);
            this._reflect = refl.getIfy(this._type);
        }

        return super.setOptions(options);
    }
}
