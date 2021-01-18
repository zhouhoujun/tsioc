import { Action, ActionType, AsyncHandler, chain } from '@tsdi/ioc';


/**
 * handle interface.
 *
 * @export
 * @interface IHandle
 * @template T
 */
export interface IHandle<T = any> {
    /**
     * execute handle.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    execute(ctx: T, next?: () => Promise<void>): Promise<void>;

    /**
     * to action.
     *
     * @returns {AsyncHandler<T>}
     */
    toAction(): AsyncHandler<T>;
}


/**
 *  handle type.
 */
export type HandleType<T = any> = ActionType<IHandle<T>, AsyncHandler<T>>;

/**
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @template T
 */
export abstract class Handle<T> extends Action implements IHandle<T> {

    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    protected execFuncs(ctx: T, handles: AsyncHandler<T>[], next?: () => Promise<void>): Promise<void> {
        return chain(handles, ctx, next);
    }

    private _action: AsyncHandler<T>;
    toAction(): AsyncHandler<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._action;
    }

}
