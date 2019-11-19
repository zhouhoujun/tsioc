import { Token, Type } from '../types';
import { lang, isFunction, isClass, isToken } from '../utils';
import { Inject } from '../decorators';
import { ITypeReflect, TypeReflects } from '../services';
import { IIocContainer, IocContainerToken, ContainerFactory } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { ActionRegisterer } from './ActionRegisterer';
import { ProviderMap, ProviderTypes, ProviderParser } from '../providers';
import { InjectToken } from '../InjectToken';


/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption<T extends IIocContainer = IIocContainer> {
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
    abstract get reflects(): TypeReflects;

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


export const CTX_PROVIDERS = new InjectToken<ProviderTypes[]>('CTX_PROVIDERS');
export const CTX_PROVIDER_MAP = new InjectToken<ProviderMap>('CTX_PROVIDER_MAP');
/**
 * context with raise container.
 *
 * @export
 * @class IocRasieContext
 * @extends {IocActionContext}
 */
export abstract class IocRaiseContext<T extends IIocContainer = IIocContainer> extends IocActionContext {
    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    get reflects(): TypeReflects {
        return this.getContext(TypeReflects) || this.getRaiseContainer().getTypeReflects();
    }

    /**
     * context providers of boot.
     *
     * @type {ProviderMap}
     * @memberof BootContext
     */
    contexts: ProviderMap;

    hasContext(token: Token): boolean {
        return this.contexts ? this.contexts.has(token) : false;
    }
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof BootContext
     */
    getContext<T>(token: Token<T>): T {
        if (this.contexts) {
            return this.contexts.resolve<T>(token);
        }
        return null;
    }
    /**
     * set provider of this context.
     *
     * @param {Token} token context provider token.
     * @param {*} provider context provider.
     * @memberof BootContext
     */
    setContext(token: Token, provider: any);
    /**
     * set context provider of boot application.
     *
     * @param {...ProviderTypes[]} providers
     * @memberof BootContext
     */
    setContext(...providers: ProviderTypes[]);
    setContext(...providers: any[]) {
        if (providers.length === 2 && isToken(providers[0])) {
            if (!this.contexts) {
                this.contexts = this.getRaiseContainer().getInstance(ProviderMap);
            }
            this.contexts.add(providers[0], providers[1]);
        } else {
            let pr = this.getRaiseContainer().getInstance(ProviderParser);
            if (this.contexts) {
                pr.parseTo(this.contexts, ...providers);
            } else {
                this.contexts = pr.parse(...providers);
            }
        }
    }

    /**
     * get raise container factory.
     *
     * @returns {ContainerFactory}
     * @memberof IocRasieContext
     */
    getContainerFactory(): ContainerFactory<T> {
        return this.contexts.getContainerFactory();
    }
    /**
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer(): T {
        return this.contexts.getContainer() as T;
    }

    setRaiseContainer(raiseContainer: T | ContainerFactory<T>) {
        if (this.contexts) {
            this.contexts.setContainer(raiseContainer);
        } else if (raiseContainer) {
            this.contexts = new ProviderMap(raiseContainer);
        }
    }

    setOptions(options: ActionContextOption) {
        if (options && options.raiseContainer) {
            this.setRaiseContainer(options.raiseContainer as ContainerFactory<T>);
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

