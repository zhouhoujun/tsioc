import { Token, Type, SymbolType } from '../types';
import { lang, isArray } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Inject } from '../decorators/Inject';
import { ProviderTypes } from '../providers/types';
import { IIocContainer } from '../IIocContainer';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../context-tokens';
import { IInjector, INJECTOR, PROVIDERS, IProviders } from '../IInjector';
import { isInjector } from '../BaseInjector';
import { ActionContextOption, Action } from './Action';
import { IocDestoryable } from '../Destoryable';

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
    TJ extends IInjector = IInjector,
    TC extends IIocContainer = IIocContainer> extends IocActionContext {

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
        return this.context.getSingleton(INJECTOR) as TJ;
    }

    /**
     * get type reflects.
     */
    get reflects(): ITypeReflects {
        if (!this.context.hasSingleton(TypeReflectsToken)) {
            this.context.setValue(TypeReflectsToken, this.injector.getSingleton(TypeReflectsToken));
        }
        return this.context.getSingleton(TypeReflectsToken);
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
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: SymbolType<T>): T {
        return this.context.getSingleton(key);
    }

    setValue<T>(key: SymbolType<T>, value: T) {
        this.context.setValue(key, value);
        return this;
    }

    /**
     * set provider of this context.
     *
     * @param {Token} token context provider token.
     * @param {*} value context value.
     * @memberof BootContext
     */
    set(token: Token, value: any);
    /**
     * set context provider of boot application.
     *
     * @param {...ProviderTypes[]} providers
     * @memberof BootContext
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
     *
     * @memberof ResovleContext
     */
    getContainer<T extends TC>(): T {
        return this.injector.getContainer() as T;
    }

    /**
     * set options for context.
     * @param options options.
     */
    setOptions(options: T) {
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
    }

    /**
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T {
        return this.context.getSingleton(CTX_OPTIONS) as T;
    }

    cloneContext(filter?: (key: Token) => boolean) {
        return this.context.clone(filter || (k => !k.toString().startsWith('CTX_')));
    }

    /**
     * clone contexts.
     */
    clone(options?: T, filter?: (key: Token) => boolean): this {
        return createRaiseContext(this.injector, lang.getClass(this), { ...this.getOptions(), contexts: this.cloneContext(filter), ...options || {} });
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


export abstract class IocProvidersContext<
    T extends IocProvidersOption = IocProvidersOption,
    TJ extends IInjector = IInjector,
    TC extends IIocContainer = IIocContainer> extends IocRaiseContext<T, TJ, TC> {

    private _originPdr: boolean;
    /**
     * get providers of options.
     */
    get providers(): IProviders {
        if (!this.context.hasSingleton(CTX_PROVIDERS)) {
            this._originPdr = true;
            this.setValue(CTX_PROVIDERS, this.injector.get(PROVIDERS));
        }
        return this.context.getSingleton(CTX_PROVIDERS);
    }

    setOptions(options: T) {
        super.setOptions(options);
        if (options && options.providers) {
            if (isInjector(options.providers)) {
                this.setValue(CTX_PROVIDERS, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
    }

    protected destroying() {
        if (this._originPdr) {
            this.providers?.destroy();
        }
        super.destroying();
    }
}

/**
 * action.
 *
 * @export
 * @abstract
 * @class Action
 * @extends {IocCoreService}
 */
export abstract class IocAction<T extends IocActionContext = IocActionContext> extends Action {

    abstract execute(ctx: T, next: () => void): void;

    protected execFuncs(ctx: T, actions: lang.Action[], next?: () => void) {
        lang.execAction(actions, ctx, next);
    }

    private _action: lang.Action<T>
    toAction(): lang.Action<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => void) => this.execute(ctx, next);
        }
        return this._action;
    }
}
