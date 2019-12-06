import { Token, Type } from '../types';
import { lang, isFunction, isClass } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Inject } from '../decorators/Inject';
import { Injector } from '../providers/ProviderMap';
import { ProviderTypes } from '../providers/types';
import { IIocContainer, IocContainerToken, ContainerFactory, ContainerFactoryToken } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { ActionRegisterer } from './ActionRegisterer';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../context-tokens';


/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption<T extends IIocContainer = IIocContainer> {
    /**
     * providers for contexts.
     *
     * @type {(ProviderTypes[] | Injector)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | Injector;
    /**
     * raise contianer.
     */
    raiseContainer?: ContainerFactory<T>;
}

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

export function createRaiseContext<Ctx extends IocRaiseContext>(CtxType: Type<Ctx>, options: ActionContextOption, raiseContainer?: ContainerFactory): Ctx {
    if (!options.raiseContainer) {
        options.raiseContainer = raiseContainer;
    }
    let ctx = new CtxType(options.raiseContainer);
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

    constructor(@Inject(ContainerFactoryToken) raiseContainer: ContainerFactory<TC>) {
        super();
        this.contexts = new Injector(raiseContainer);
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

    /**
     * context providers of boot.
     *
     * @type {Injector}
     * @memberof BootContext
     */
    protected contexts: Injector;

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
        return this.contexts.resolve<T>(token);
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
            this.contexts.add(providers[0], providers[1]);
        } else {
            this.contexts.parse(...providers);
        }
    }

    /**
     * get raise container factory.
     *
     * @returns {ContainerFactory}
     * @memberof IocRasieContext
     */
    getFactory(): ContainerFactory<TC> {
        return this.contexts.getFactory();
    }

    /**
     * use `getFactory` instead.
     */
    getContainerFactory(): ContainerFactory<TC> {
        return this.contexts.getFactory();
    }

    hasContainer(): boolean {
        return this.contexts.hasContainer();
    }
    /**
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getContainer(): TC {
        return this.contexts.getContainer() as TC;
    }

    setContainer(raiseContainer: TC | ContainerFactory<TC>) {
        this.contexts.setContainer(raiseContainer);
    }

    /**
     * get raise container. use `getContainer` instead.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer(): TC {
        return this.contexts.getContainer() as TC;
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
        if (!this.contexts.hasContainer() && options.raiseContainer) {
            this.setContainer(options.raiseContainer as ContainerFactory<TC>);
        }
        if (options.contexts) {
            if (options.contexts instanceof Injector) {
                if (this.contexts) {
                    this.contexts.copy(options.contexts);
                } else {
                    this.contexts = options.contexts;
                }
            } else {
                this.set(...options.contexts);
            }
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
    clone(): Injector {
        return this.contexts.clone();
    }

}

export interface IocProvidersOption<T extends IIocContainer = IIocContainer> extends ActionContextOption<T> {
    /**
     *  providers.
     */
    providers?: ProviderTypes[];
}
export abstract class IocProvidersContext<T extends IocProvidersOption = IocProvidersOption, TC extends IIocContainer = IIocContainer> extends IocRaiseContext<T, TC> {

    /**
     * get providers of options.
     */
    get providers(): Injector {
        if (!this.has(CTX_PROVIDERS)) {
            this.set(CTX_PROVIDERS, new Injector(this.getFactory()));
        }
        return this.get(CTX_PROVIDERS);
    }

    setOptions(options: T) {
        super.setOptions(options);
        if (options && options.providers) {
            this.providers.parse(...options.providers);
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
export abstract class IocAction<T extends IocActionContext = IocActionContext> {

    @Inject(IocContainerToken)
    protected container: IIocContainer;

    constructor(container: IIocContainer) {
        if (container) {
            this.container = container;
        }
    }

    abstract execute(ctx: T, next: () => void): void;

    protected execFuncs(ctx: T, actions: lang.IAction[], next?: () => void) {
        lang.execAction(actions, ctx, next);
    }

    private _action: lang.IAction<T>
    toAction(): lang.IAction<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => void) => this.execute(ctx, next);
        }
        return this._action;
    }

    protected parseAction(ac: IocActionType) {
        if (isClass(ac)) {
            let action = this.container.getInstance(ActionRegisterer).get(ac);
            return action instanceof IocAction ? action.toAction() : null;
        } if (ac instanceof IocAction) {
            return ac.toAction()
        }
        return isFunction(ac) ? ac : null;
    }
}

/**
 * ioc action type.
 */
export type IocActionType<T = IocAction, TAction = lang.IAction> = Token<T> | T | TAction;

