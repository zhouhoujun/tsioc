import { Token, Type, Factory } from '../types';
import { lang, isArray } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Inject } from '../decorators/Inject';
import { ProviderTypes } from '../providers/types';
import { IIocContainer, ContainerFactory, ContainerFactoryToken } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../context-tokens';
import { IInjector, InjectorToken } from '../IInjector';
import { isInjector } from '../BaseInjector';
import { InjectToken } from '../InjectToken';


/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption {
    /**
     * providers for contexts.
     *
     * @type {(ProviderTypes[] | IInjector)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | IInjector;
    /**
     * injector.
     */
    injector?: IInjector;
}

/**
 * action injector.
 */
export interface IActionInjector extends IInjector {
    /**
     * register action, simple create instance via `new type(this)`.
     * @param type
     */
    regAction<T extends Action>(type: Type<T>): this;
    getAction<T extends Function>(target: Token<Action> | Action | Function): T;
    register<T>(token: Token<T>, fac: Factory<T>);
}

export const ActionInjectorToken = new InjectToken<IActionInjector>('_IOC_ActionInjector');


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
     * set options.
     *
     * @param {ActionContextOption} options
     * @memberof IocActionContext
     */
    abstract setOptions(options: ActionContextOption);
}

export function createRaiseContext<Ctx extends IocRaiseContext>(CtxType: Type<Ctx>, options: ActionContextOption, containerFactory: ContainerFactory): Ctx {
    let ctx = new CtxType(containerFactory);
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

    constructor(@Inject(ContainerFactoryToken) private containerFactory: ContainerFactory<TC>) {
        super();

    }

    get injector(): IInjector {
        return this.get(InjectorToken);
    }

    /**
     * get type reflects.
     */
    get reflects(): ITypeReflects {
        let reflects = this.get(TypeReflectsToken);
        if (!reflects) {
            reflects = this.getContainer().getTypeReflects();
            this.set(TypeReflectsToken, reflects);
        }
        return reflects;
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
            this._context.get(InjectorToken);
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
        return this.contexts.get<T>(token);
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
            this.contexts.set(this.contexts.getTokenKey(provde), () => value);
        } else {
            this.contexts.inject(...providers);
        }
    }

    /**
     * get raise container factory.
     *
     * @returns {ContainerFactory}
     * @memberof IocRasieContext
     */
    getFactory(): ContainerFactory<TC> {
        return this.containerFactory;
    }

    /**
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getContainer(): TC {
        return this.containerFactory() as TC;
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
            } else if (isArray(options.contexts)) {
                this.set(...options.contexts);
            }
        }
        if (options.injector) {
            this.set(InjectorToken, options.injector);
        } else if (!this.has(InjectorToken)) {
            this.set(InjectorToken, this.getContainer());
        }
        this._options = this._options ? Object.assign(this._options, options) : options;
        this.set(CTX_OPTIONS, this._options);
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

    /**
     * clone contexts.
     */
    clone(): IInjector {
        return this.contexts.clone();
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
            this.set(CTX_PROVIDERS, this.getContainer().get(InjectorToken));
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
 * action interface.
 */
export abstract class Action {
    abstract toAction(): Function;
}

/**
 * action setup.
 */
export interface IActionSetup {
    setup();
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

/**
 * ioc action type.
 */
export type IocActionType<T extends Action = Action, TAction = lang.Action> = Token<T> | T | TAction;

