import { Middleware, MiddlewareType, Next } from './Middleware';
import { BootContext } from '../BootContext';
import { isClass, PromiseUtil, Type } from '@ts-ioc/ioc';


/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class CompositeMiddleware<T extends BootContext> extends Middleware<T> {

    protected actions: MiddlewareType<T>[];
    constructor() {
        super();
        this.actions = [];
    }

    /**
     * use action.
     *
     * @param {IocActionType} action
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(action: MiddlewareType<T>, first?: boolean): this {
        if (first) {
            this.actions.unshift(action);
        } else {
            this.actions.push(action);
        }
        return this;
    }

    /**
     * use action before
     *
     * @param {IocActionType} action
     * @param {IocActionType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(action: MiddlewareType<T>, before: MiddlewareType<T>): this {
        this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
        return this;
    }
    /**
     * use action after.
     *
     * @param {IocActionType} action
     * @param {IocActionType} after
     * @returns {this}
     * @memberof LifeScope
     */
    useAfter(action: MiddlewareType<T>, after: MiddlewareType<T>): this {
        this.actions.splice(this.actions.indexOf(after), 0, action);
        return this;
    }

    async execute(ctx: T, next?: Next): Promise<void> {
        this.execActions(ctx, this.actions, next);
    }

    protected execActions(ctx: T, actions: MiddlewareType<T>[], next?: Next) {
        PromiseUtil.runInChain(actions.map(ac => this.toActionFunc(ac)), ctx, next);
    }

    protected toActionFunc(ac: MiddlewareType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            return (ctx: T, next?: Next) => {
                let action = this.resolveAction(ctx, ac);
                if (action instanceof Middleware) {
                    return action.execute(ctx, next);
                } else {
                    return next();
                }
            }
        } else if (ac instanceof Middleware) {
            return (ctx: T, next?: Next) => ac.execute(ctx, next);
        }
        return ac;
    }

    protected resolveAction(ctx: T, ac: Type<Middleware<T>>) {
        return ctx.resolve(ac);
    }
}
