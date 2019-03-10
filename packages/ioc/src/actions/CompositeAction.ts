import { IocAction, IocActionType, IocActionContext } from './Action';
import { lang, isClass } from '../utils';
import { Type } from '../types';

export class CompositeAction<T extends IocActionContext> extends IocAction<T> {

    protected actions: IocActionType[];
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
    use(action: IocActionType, first?: boolean): this {
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
    useBefore(action: IocActionType, before: IocActionType): this {
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
    useAfter(action: IocActionType, after: IocActionType): this {
        this.actions.splice(this.actions.indexOf(after), 0, action);
        return this;
    }
    
    execute(ctx: T, next?: () => void): void {
        this.execActions(ctx, this.actions, next);
    }

    protected execActions(ctx: T, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => this.toActionFunc(ac)), ctx, next);
    }

    protected toActionFunc(ac: IocActionType) {
        if (isClass(ac)) {
            return (ctx: T, next?: () => void) => {
                let action = this.resolveAction(ctx, ac);
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

    protected resolveAction(ctx: T, ac: Type<IocAction<any>>) {
        return ctx.resolve(ac);
    }

}