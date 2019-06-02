import { IIocContainer, IocContainerToken, ContainerFactory, ContainerFactoryToken } from '../IIocContainer';
import { Type } from '../types';
import { lang, isFunction, isClass } from '../utils';
import { Inject } from '../decorators';
import { IocCoreService } from '../services';


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
export class IocActionContext extends IocCoreService {

    /**
     * curr action scope
     *
     * @type {IocAction<any>}
     * @memberof IocActionContext
     */
    actionScope?: any;

    @Inject(ContainerFactoryToken)
    protected raiseContainerGetter: ContainerFactory;


    constructor() {
        super()
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

    setRaiseContainer(raiseContainer: IIocContainer | ContainerFactory) {
        if (isFunction(raiseContainer)) {
            this.raiseContainerGetter = raiseContainer;
        } else if (raiseContainer) {
            this.raiseContainerGetter = raiseContainer.get(ContainerFactoryToken);
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
        if (container) {
            this.container = container;
        }
    }

    abstract execute(ctx: T, next: () => void): void;

    protected execFuncs(ctx: T, actions: lang.IAction<any>[], next?: () => void) {
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
            let action = this.container.getActionRegisterer().get(ac);
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
export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

