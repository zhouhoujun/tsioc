import { Token, SymbolType } from '../types';
import { lang } from '../utils/lang';
import { ProviderTypes } from '../providers/types';
import { IIocContainer } from '../IIocContainer';
import { ITypeReflects } from '../services/ITypeReflects';
import { IInjector, IProviders } from '../IInjector';
import { ActionContextOption, Action } from './Action';
import { IDestoryable } from '../Destoryable';


/**
 * context interface.
 */
export interface IIocContext<
    T extends ActionContextOption = ActionContextOption,
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
    remove(...tokens: Token[]);
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     */
    get<T>(token: Token<T>): T;
    getInstance<T>(token: SymbolType<T>): T;
    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: SymbolType<T>): T;
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

    clone(): this;
    /**
     * clone the context.
     * @param empty empty context or not.
     */
    clone(empty: boolean): this;
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
