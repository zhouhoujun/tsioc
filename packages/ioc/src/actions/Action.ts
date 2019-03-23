import { IIocContainer, IocContainerToken } from '../IIocContainer';
import { Type, Token } from '../types';
import { IocCoreService } from '../services';
import { lang, isFunction } from '../utils';
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

    private raiseContainerGetter: () => IIocContainer;

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
     * parse context.
     *
     * @static
     * @param {ActionContextOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {IocActionContext}
     * @memberof IocActionContext
     */
    static parse(options: ActionContextOption, raiseContainer?: IIocContainer | (() => IIocContainer)): IocActionContext {
        let ctx = new IocActionContext(raiseContainer);
        ctx.setOptions(options);
        return ctx;
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
export abstract class IocAction<T extends IocActionContext> extends IocCoreService {

    @Inject(IocContainerToken)
    protected container: IIocContainer

    constructor(container?: IIocContainer) {
        super();
        if (container) {
            this.container = container;
        }
        this.initAction();
    }

    protected initAction() {

    }

    abstract execute(ctx: T, next: () => void): void;
}


export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

