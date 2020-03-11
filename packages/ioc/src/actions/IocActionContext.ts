import { isArray, lang, isBoolean } from '../utils/lang';
import { ActionContextOption } from './Action';
import { ProviderTypes } from '../providers/types';
import { IIocContainer } from '../IIocContainer';
import { CTX_PROVIDERS, CTX_OPTIONS } from '../context-tokens';
import { IInjector, PROVIDERS, IProviders, INJECTOR, isInjector } from '../IInjector';
import { IocDestoryable } from '../Destoryable';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { IIocContext } from './IocAction';
import { Inject } from '../decorators/Inject';
import { Token, SymbolType, Type } from '../types';
import { isToken } from '../utils/isToken';


/**
 * ioc action context.
 *
 * @export
 * @class IocActionContext
 */
export abstract class IocActionContext extends IocDestoryable {

    /**
     * reflects.
     *
     * @type {TypeReflects}
     * @memberof IocActionContext
     */
    abstract get reflects(): ITypeReflects;

    /**
     * set options.
     *
     * @param {ActionContextOption} options
     * @memberof IocActionContext
     */
    abstract setOptions(options: ActionContextOption);
}

export function createRaiseContext<Ctx extends IocRaiseContext>(injector: IInjector, CtxType: Type<Ctx>, options: ActionContextOption): Ctx {
    let ctx = new CtxType(injector);
    options && ctx.setOptions(options);
    return ctx;
}

/**
 * context with raise container.
 *
 * @export
 * @class IocRasieContext
 * @extends {IocActionContext}
 */
export abstract class IocRaiseContext<
    T extends ActionContextOption = ActionContextOption,
    TJ extends IInjector = IInjector> extends IocActionContext implements IIocContext<T, TJ> {

    public readonly context: IProviders;

    constructor(@Inject(INJECTOR) injector: TJ) {
        super();
        this.context = injector.get(PROVIDERS);
        this.context.setValue(INJECTOR, injector);
    }

    /**
     * raise injector of this context.
     */
    get injector(): TJ {
        return this.context.getValue(INJECTOR) as TJ;
    }

    /**
     * get type reflects.
     */
    get reflects(): ITypeReflects {
        return this.context.getValue(TypeReflectsToken) ?? this.getReflects();
    }

    protected getReflects() {
        let reflects = this.injector.getSingleton(TypeReflectsToken);
        this.context.setValue(TypeReflectsToken, reflects);
        return reflects;
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
        return this.context.hasSingleton(token);
    }

    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: Token[]) {
        tokens.forEach(tk => {
            this.context.unregister(tk);
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
     * @param {...ProviderTypes[]} providers
     */
    set(...providers: ProviderTypes[]);
    set(...providers: any[]) {
        if (providers.length === 2 && isToken(providers[0])) {
            let provde = providers[0];
            let value = providers[1];
            this.context.registerValue(provde, value);
        } else {
            this.context.inject(...providers);
        }
        return this;
    }

    /**
     * get root container.
     */
    getContainer(): IIocContainer {
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
        options = this.context.hasSingleton(CTX_OPTIONS) ? Object.assign(this.getOptions(), options) : options;
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
            return options ? createRaiseContext(this.injector, lang.getClass(this), null)
                : createRaiseContext(this.injector, lang.getClass(this), this.getOptions());
        } else {
            return createRaiseContext(this.injector, lang.getClass(this), { ...this.getOptions(), contexts: this.context.clone(), ...options || {} });
        }
    }

    protected destroying() {
        this.context.destroy();
    }

}


export interface IocProvidersOption extends ActionContextOption {
    /**
     *  providers.
     */
    providers?: ProviderTypes[] | IInjector;
}

export interface IIocProvidersContext<
    T extends IocProvidersOption = IocProvidersOption,
    TJ extends IInjector = IInjector> extends IIocContext<T, TJ> {
    /**
     * get providers of options.
     */
    readonly providers: IProviders;
}


export abstract class IocProvidersContext<
    T extends IocProvidersOption = IocProvidersOption,
    TJ extends IInjector = IInjector> extends IocRaiseContext<T, TJ> {

    /**
     * get providers of options.
     */
    get providers(): IProviders {
        return this.context.getValue(CTX_PROVIDERS) ?? this.getProviders();
    }

    private _originPdr: boolean;
    protected getProviders() {
        this._originPdr = true;
        let providers = this.injector.get(PROVIDERS);
        this.setValue(CTX_PROVIDERS, providers);
        return providers;
    }

    setOptions(options: T) {
        if (options && options.providers) {
            if (isInjector(options.providers)) {
                this.setValue(CTX_PROVIDERS, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
        return super.setOptions(options);
    }

    protected destroying() {
        if (this._originPdr) {
            this.providers?.destroy();
        }
        super.destroying();
    }
}
