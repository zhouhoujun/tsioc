import { Token, SymbolType, Type } from '../types';
import { Handler, chain, isBoolean, isClass, isArray, lang } from '../utils/lang';
import { ProviderTypes, InjectTypes } from '../providers/types';
import { IIocContainer } from '../IIocContainer';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { IInjector, IProviders, INJECTOR, PROVIDERS, isInjector } from '../IInjector';
import { ActCtxOption, Action, ActionType, IActionInjector } from './Action';
import { IDestoryable, IocDestoryable } from '../Destoryable';
import { Inject } from '../decorators';
import { isToken } from '../utils/isToken';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../utils/tk';


/**
 * context interface.
 */
export interface IIocContext<
    T extends ActCtxOption = ActCtxOption,
    TJ extends IInjector = IInjector> extends IDestoryable {
    /**
     * current injector.
     */
    readonly injector: TJ;

    /**
     * current context providers.
     */
    readonly context: IProviders;
    /**
     * reflects.
     */
    readonly reflects: ITypeReflects;
    /**
     * has register in context or not.
     * @param token
     */
    has(token: Token): boolean;
    /**
    * has value in context or not.
    * @param token
    */
    hasValue(token: SymbolType): boolean;
    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: SymbolType[]);
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    get<T>(token: Token<T>): T;
    /**
     * get instance.
     * @param token the token key of instance.
     */
    getInstance<T>(token: SymbolType<T>): T;
    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: SymbolType<T>): T;
    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: SymbolType<T>, value: T): this;
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
    /**
     * get root container.
     */
    getContainer(): IIocContainer;
    /**
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T;

    /**
     * set options for context.
     * @param options options.
     */
    setOptions(options: T): this;

    /**
     * clone this context.
     */
    clone(): this;
    /**
     * clone this context with out options.
     * @param empty empty context or not.
     */
    clone(empty: boolean): this;
    /**
     * clone this context with custom options.
     * @param options custom options.
     */
    clone(options: T): this;
}


/**
 * action.
 *
 * @export
 * @abstract
 * @class Action
 * @extends {IocCoreService}
 */
export abstract class IocAction<T extends IIocContext> extends Action {

    abstract execute(ctx: T, next: () => void): void;

    protected execFuncs(ctx: T, actions: Handler[], next?: () => void) {
        chain(actions, ctx, next);
    }

    private _action: Handler;
    toAction(): Handler {
        if (!this._action) {
            this._action = (ctx: T, next?: () => void) => this.execute(ctx, next);
        }
        return this._action;
    }
}



/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class IocCompositeAction<T extends IIocContext = IIocContext> extends IocAction<T> {

    protected actions: ActionType[];
    protected befores: ActionType[];
    protected afters: ActionType[];
    private handlers: Handler[];

    constructor(protected actInjector: IActionInjector) {
        super();
        this.befores = [];
        this.actions = [];
        this.afters = [];
    }

    has(action: ActionType) {
        return this.actions.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {ActionType} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     * @memberof LifeScope
     */
    use(action: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        this.actions.push(action);
        this.regAction(action);
        this.resetFuncs();
        return this;
    }

    /**
     * use action before
     *
     * @param {ActionType} action
     * @param {ActionType} [before]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useBefore(action: ActionType, before?: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        if (before) {
            this.actions.splice(this.actions.indexOf(before), 0, action);
        } else {
            this.actions.unshift(action);
        }
        this.regAction(action);
        this.resetFuncs();
        return this;
    }

    /**
     * use action after.
     *
     * @param {ActionType} action
     * @param {ActionType} [after]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useAfter(action: ActionType, after?: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        if (after && !isBoolean(after)) {
            this.actions.splice(this.actions.indexOf(after) + 1, 0, action);
        } else {
            this.actions.push(action);
        }
        this.regAction(action);
        this.resetFuncs();
        return this;
    }

    /**
     * register actions before run this scope.
     *
     * @param {ActionType} action
     * @memberof IocCompositeAction
     */
    before(action: ActionType): this {
        if (this.befores.indexOf(action) < 0) {
            this.befores.push(action);
            this.regAction(action);
            this.resetFuncs();
        }
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {ActionType} action
     * @memberof IocCompositeAction
     */
    after(action: ActionType): this {
        if (this.afters.indexOf(action) < 0) {
            this.afters.push(action);
            this.regAction(action);
            this.resetFuncs();
        }
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        if (!this.handlers) {
            this.handlers = [...this.befores, ...this.actions, ...this.afters].map(ac => this.actInjector.getAction<Handler<T>>(ac)).filter(f => f);
        }
        this.execFuncs(ctx, this.handlers, next);
    }

    protected regAction(ac: any) {
        if (isClass(ac)) {
            this.actInjector.regAction(ac);
        }
    }

    protected resetFuncs() {
        this.handlers = null;
    }

}



/**
 * ioc action context.
 *
 * @export
 * @class IocActCtx
 */
export abstract class IocActCtx extends IocDestoryable {

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
     * @param {ActCtxOption} options
     * @memberof IocActionContext
     */
    abstract setOptions(options: ActCtxOption);
}

export function createContext<Ctx extends IocContext>(injector: IInjector, CtxType: Type<Ctx>, options: ActCtxOption): Ctx {
    let ctx = new CtxType(injector);
    options && ctx.setOptions(options);
    return ctx;
}

/**
 * context with raise container.
 *
 * @export
 * @class IocRasieContext
 * @extends {IocActCtx}
 */
export abstract class IocContext<
    T extends ActCtxOption = ActCtxOption,
    TJ extends IInjector = IInjector> extends IocActCtx implements IIocContext<T, TJ> {

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
        let reflects = this.injector.getInstance(TypeReflectsToken);
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
    }

}


export interface IocPdrsOption extends ActCtxOption {
    /**
     *  providers.
     */
    providers?: InjectTypes[] | IInjector;
}

export interface IIocPdrsContext<
    T extends IocPdrsOption = IocPdrsOption,
    TJ extends IInjector = IInjector> extends IIocContext<T, TJ> {
    /**
     * get providers of options.
     */
    readonly providers: IProviders;
}


export abstract class IocPdrsContext<
    T extends IocPdrsOption = IocPdrsOption,
    TJ extends IInjector = IInjector> extends IocContext<T, TJ> {

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
