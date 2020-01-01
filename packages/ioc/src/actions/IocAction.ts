import { Token, Type } from '../types';
import { lang, isArray } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Inject } from '../decorators/Inject';
import { ProviderTypes } from '../providers/types';
import { IIocContainer, ContainerFactory, ContainerFactoryToken, IocContainerToken } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../context-tokens';
import { IInjector, InjectorToken, INJECTOR } from '../IInjector';
import { isInjector } from '../BaseInjector';
import { ActionContextOption, Action } from './Action';
import { ContextInjector } from '../Injector';

/**
 * ioc action context.
 *
 * @export
 * @class IocActionContext
 */
export abstract class IocActionContext extends IocCoreService {

    /**
     * reflects.
     *
     * @type {TypeReflects}
     * @memberof IocActionContext
     */
    abstract get reflects(): ITypeReflects;

    /**
     * clear.
     */
    abstract clear(): void;

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
export abstract class IocRaiseContext<T extends ActionContextOption = ActionContextOption, TC extends IIocContainer = IIocContainer> extends IocActionContext {

    private _injector: IInjector;
    constructor(@Inject(InjectorToken) injector: IInjector) {
        super();
        this._injector = injector;
    }

    get injector(): IInjector {
        return this._injector;
    }

    /**
     * get type reflects.
     */
    get reflects(): ITypeReflects {
        return this.injector.get(TypeReflectsToken);
    }

    private _context: IInjector;
    /**
     * context providers of boot.
     *
     * @type {IInjector}
     * @memberof BootContext
     */
    get contexts(): IInjector {
        if (!this._context) {
            this._context = this.injector.get(ContextInjector);
            this._context.registerValue(InjectorToken, this._injector);
        }
        return this._context;
    }

    /**
     * has context or not.
     * @param token
     */
    has(token: Token): boolean {
        return this.contexts ? this.contexts.has(token) : false;
    }

    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: Token[]) {
        tokens.forEach(tk => {
            this.contexts.unregister(tk);
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
        return this.contexts.get(token);
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
            if (provde === InjectorToken) {
                this._injector = value;
            }
            this.contexts.registerValue(provde, value);
        } else {
            this.contexts.inject(...providers);
        }
    }

    /**
     * get root container.
     *
     * @memberof ResovleContext
     */
    getContainer<T extends TC>(): T {
        return this.injector.get(IocContainerToken) as T;
    }

    protected _options: T;
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
                if (this._context) {
                    this._context.copy(options.contexts);
                } else {
                    this._context = options.contexts;
                }
                this._context.registerValue(InjectorToken, this._injector);
            } else if (isArray(options.contexts)) {
                this.contexts.inject(...options.contexts);
            }
        }
        this._options = this._options ? Object.assign(this._options, options) : options;
        this.contexts.registerValue(CTX_OPTIONS, this._options);
    }

    /**
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T {
        if (!this._options) {
            this._options = this.get(CTX_OPTIONS) as T;
            if (!this._options) {
                this._options = {} as T;
                this.set(CTX_OPTIONS, this._options);
            }
        }
        return this._options;
    }

    cloneContext(filter?: (key: Token) => boolean) {
        return this.contexts.clone(filter || (k => !k.toString().startsWith('CTX_')));
    }

    /**
     * clone contexts.
     */
    clone(options?: T, filter?: (key: Token) => boolean): this {
        return createRaiseContext(this.injector, lang.getClass(this), { ...this.getOptions(), contexts: this.cloneContext(filter), ...options || {} });
    }

    clear() {
        this.contexts.clear();
    }

}

export interface IocProvidersOption extends ActionContextOption {
    /**
     *  providers.
     */
    providers?: ProviderTypes[] | IInjector;
}


export abstract class IocProvidersContext<T extends IocProvidersOption = IocProvidersOption, TC extends IIocContainer = IIocContainer> extends IocRaiseContext<T, TC> {

    /**
     * get providers of options.
     */
    get providers(): IInjector {
        if (!this.has(CTX_PROVIDERS)) {
            this.set(CTX_PROVIDERS, this.injector.get(INJECTOR));
        }
        return this.get(CTX_PROVIDERS);
    }

    setOptions(options: T) {
        super.setOptions(options);
        if (options && options.providers) {
            if (isInjector(options.providers)) {
                this.set(CTX_PROVIDERS, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
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
