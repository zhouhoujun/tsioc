import { IIocContainer, IocContainerToken } from '../IIocContainer';
import { Type, Token } from '../types';
import { lang, isFunction, isClass } from '../utils';
import { IocCompositeAction } from './IocCompositeAction';
import { Inject } from '../decorators';


/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption {
    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ActionContextOption
     */
    token?: Token<any>;
}

/**
 * ioc action context.
 *
 * @export
 * @class IocActionContext
 */
export class IocActionContext {

    protected raiseContainerGetter: () => IIocContainer;

    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token: Token<any>;

    /**
     * currScope
     *
     * @type {IocAction<any>}
     * @memberof IocActionContext
     */
    currScope?: IocCompositeAction<any>;


    constructor(raiseContainer?: IIocContainer | (() => IIocContainer)) {
        raiseContainer && this.setRaiseContainer(raiseContainer)
    }

    /**
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer() {
        if (this.raiseContainerGetter) {
            return this.raiseContainerGetter();
        } else {
            throw new Error('has not setting raise container');
        }
    }

    protected setRaiseContainer(raiseContainer: IIocContainer | (() => IIocContainer)) {
        if (isFunction(raiseContainer)) {
            this.raiseContainerGetter = raiseContainer;
        } else {
            this.raiseContainerGetter = () => raiseContainer;
        }
    }

    /**
     * set options.
     *
     * @param {ActionContextOption} options
     * @memberof IocActionContext
     */
    setOptions(options: ActionContextOption) {
        if (options) {
            Object.assign(this, options);
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
export abstract class IocAction<T extends IocActionContext> {

    @Inject(IocContainerToken)
    protected container: IIocContainer;

    constructor(container?: IIocContainer) {
        this.container = container;
        this.initAction();
    }

    protected initAction() {

    }

    abstract execute(ctx: T, next: () => void): void;

    protected execActions(ctx: T, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => this.toActionFunc(ac)), ctx, next);
    }

    protected toActionFunc(ac: IocActionType) {
        if (isClass(ac)) {
            return (ctx: T, next?: () => void) => {
                let action = this.resolveAction(ac);
                if (action instanceof IocAction) {
                    action.execute(ctx, next);
                } else {
                    next();
                }
            }
        } else if (ac instanceof IocAction) {
            return (ctx: T, next?: () => void) => ac.execute(ctx, next);
        }
        return ac
    }

    protected resolveAction(ac: Type<IocAction<T>>): IocAction<T> {
        return this.container.resolve(ac);
    }

}

/**
 * ioc action type.
 */
export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

