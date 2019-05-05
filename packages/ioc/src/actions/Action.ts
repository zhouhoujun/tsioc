import { IIocContainer, IocContainerToken, ContainerFactory, ContainerFactoryToken } from '../IIocContainer';
import { Type } from '../types';
import { lang, isFunction, isClass } from '../utils';
import { Inject } from '../decorators';


/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption {

}

/**
 * ioc action context.
 *
 * @export
 * @class IocActionContext
 */
export class IocActionContext {

    /**
     * currScope
     *
     * @type {IocAction<any>}
     * @memberof IocActionContext
     */
    currScope?: any;

    @Inject(ContainerFactoryToken)
    protected raiseContainerGetter: ContainerFactory;


    constructor() {
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

    setRaiseContainer(raiseContainer: IIocContainer | (() => IIocContainer)) {
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

    constructor(@Inject(IocContainerToken) protected container?: IIocContainer) {
        this.initAction();
    }

    protected initAction() {

    }

    abstract execute(ctx: T, next: () => void): void;

    protected execActions(ctx: T, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => this.toActionFunc(ac)), ctx, next);
    }

    protected execActionFuncs(ctx: T, actions: lang.IAction<any>[], next?: () => void) {
        lang.execAction(actions, ctx, next);
    }

    protected toActionFunc(ac: IocActionType) {
        if (isClass(ac)) {
            let action = this.container.get(ac);
            return action instanceof IocAction ?
                (ctx: T, next?: () => void) => action.execute(ctx, next)
                : (ctx: T, next?: () => void) => next && next();
        } if (ac instanceof IocAction) {
            return (ctx: T, next?: () => void) => ac.execute(ctx, next);
        }
        return ac
    }

    protected resolveAction(ac: Type<IocAction<T>>): IocAction<T> {
        return this.container.get(ac);
    }

}

/**
 * ioc action type.
 */
export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

