import { Token, Type } from '../types';
import { lang, isFunction, isClass, isToken } from '../utils';
import { Inject } from '../decorators';
import { IIocContainer, IocContainerToken, ContainerFactory } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { ActionRegisterer } from './ActionRegisterer';
import { ProviderMap, ProviderTypes, ProviderParser } from '../providers';
import { ITypeReflects, TypeReflectsToken } from '../services/ITypeReflects';


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
     * @type {(ProviderTypes[] | ProviderMap)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | ProviderMap;
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

export function createRaiseContext<Ctx extends IocRaiseContext>(CtxType: Type<Ctx>, target: any, raiseContainer?: ContainerFactory): Ctx {
    let ctx: Ctx;
    let options: ActionContextOption;
    if (isToken(target)) {
        ctx = new CtxType(target);
    } else if (target) {
        options = target;
        ctx = new CtxType();
    }
    raiseContainer && ctx.setRaiseContainer(raiseContainer);
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

    get reflects(): ITypeReflects {
        let reflects = this.get(TypeReflectsToken);
        if (!reflects) {
            reflects = this.getRaiseContainer().getTypeReflects();
            this.set(TypeReflectsToken, reflects);
        }
        return reflects;
    }

    /**
     * context providers of boot.
     *
     * @type {ProviderMap}
     * @memberof BootContext
     */
    contexts: ProviderMap;

    /**
     * has contxt or not.
     * @param token
     */
    has(token?: Token): boolean {
        return this.contexts ? (token ? this.contexts.has(token) : true) : false;
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
            let pr = this.getRaiseContainer().getInstance(ProviderParser);
            pr.parseTo(this.contexts, ...providers);

        }
    }

    /**
     * get raise container factory.
     *
     * @returns {ContainerFactory}
     * @memberof IocRasieContext
     */
    getContainerFactory(): ContainerFactory<TC> {
        return this.contexts.getContainerFactory();
    }

    hasRaiseContainer(): boolean {
        return !!this.contexts;
    }
    /**
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer(): TC {
        return this.contexts.getContainer() as TC;
    }

    setRaiseContainer(raiseContainer: TC | ContainerFactory<TC>) {
        if (this.contexts) {
            this.contexts.setContainer(raiseContainer);
        } else if (raiseContainer) {
            this.contexts = new ProviderMap(raiseContainer);
        }
    }

    protected _options: T;
    setOptions(options: T) {
        if (!options) {
            return;
        }
        if (options.raiseContainer) {
            this.setRaiseContainer(options.raiseContainer as ContainerFactory<TC>);
        }
        if (options.contexts) {
            if (options.contexts instanceof ProviderMap) {
                if (this.contexts) {
                    this.contexts.copy(options.contexts);
                } else {
                    this.contexts = options.contexts;
                }
            } else {
                this.set(...options.contexts);
            }
        }
        this._options = this._options ? { ...this._options, ...options } : options;
    }

    getOptions(): T {
        if (!this._options) {
            this._options = {} as T;
        }
        return this._options;
    }

}

export interface IocProvidersOption<T extends IIocContainer = IIocContainer> extends ActionContextOption<T> {
    /**
     *  providers.
     */
    providers?: ProviderTypes[];
}
export abstract class IocProvidersContext<T extends IocProvidersOption = IocProvidersOption, TC extends IIocContainer = IIocContainer> extends IocRaiseContext<T, TC> {

    get providers(): ProviderTypes[] {
        return this.getOptions().providers || [];
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

