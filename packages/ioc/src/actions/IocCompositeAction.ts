import { IocAction, IocActionType, IocActionContext } from './Action';
import { lang, isClass } from '../utils';
import { Type } from '../types';

/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class IocCompositeAction<T extends IocActionContext> extends IocAction<T> {

    protected actions: IocActionType[];
    constructor() {
        super();
        this.actions = [];
    }

    has(action: IocActionType) {
        return this.actions.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {IocActionType} action
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(action: IocActionType, first?: boolean): this {
        if (!this.has(action)) {
            if (first) {
                this.actions.unshift(action);
            } else {
                this.actions.push(action);
            }
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
    useBefore(action: IocActionType, before: IocActionType): this {
        if (!this.has(action)) {
            this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
        }
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
    useAfter(action: IocActionType, after: IocActionType): this {
        if (!this.has(action)) {
            this.actions.splice(this.actions.indexOf(after), 0, action);
        }
        return this;
    }

    execute(ctx: T, next?: () => void, filter?: (action: IocActionType) => boolean): void {
        this.execActions(ctx, this.actions, next, filter);
    }

    protected execActions(ctx: T, actions: IocActionType[], next?: () => void, filter?: (action: IocActionType) => boolean) {
        actions = filter ? actions.filter(filter) : actions;
        lang.execAction(actions.map(ac => this.toActionFunc(ac, filter)), ctx, next);
    }

    protected toActionFunc(ac: IocActionType, filter?: (action: IocActionType) => boolean) {
        if (isClass(ac)) {
            return (ctx: T, next?: () => void) => {
                let action = this.resolveAction(ctx, ac);
                if (action instanceof IocCompositeAction) {
                    action.execute(ctx, next, filter);
                } else if (action instanceof IocAction) {
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

    protected resolveAction(ctx: T, ac: Type<IocAction<T>>): IocAction<T> {
        return ctx.resolve(ac);
    }
}
