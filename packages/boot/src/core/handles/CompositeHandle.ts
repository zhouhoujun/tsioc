import { Handle, HandleType, Next } from './Handle';
import { HandleContext } from './HandleContext';
import { isClass, PromiseUtil } from '@ts-ioc/ioc';


/**
 * composite handles.
 *
 * @export
 * @class CompositeHandle
 * @extends {Handle<T>}
 * @template T
 */
export class CompositeHandle<T extends HandleContext> extends Handle<T> {

    protected handles: HandleType<T>[];
    protected initHandle() {
        this.handles = [];
    }

    /**
     * use handle.
     *
     * @param {HandleType} handle
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(handle: HandleType<T>, first?: boolean): this {
        if (first) {
            this.handles.unshift(handle);
        } else {
            this.handles.push(handle);
        }
        return this;
    }

    /**
     * use handle before
     *
     * @param {HandleType} handle
     * @param {HandleType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(handle: HandleType<T>, before: HandleType<T>): this {
        this.handles.splice(this.handles.indexOf(before) - 1, 0, handle);
        return this;
    }
    /**
     * use handle after.
     *
     * @param {HandleType} handle
     * @param {HandleType} after
     * @returns {this}
     * @memberof LifeScope
     */
    useAfter(handle: HandleType<T>, after: HandleType<T>): this {
        this.handles.splice(this.handles.indexOf(after), 0, handle);
        return this;
    }

    async execute(ctx: T, next?: Next): Promise<void> {
        await this.execHandles(ctx, this.handles, next);
    }

    protected execHandles(ctx: T, handles: HandleType<T>[], next?: Next): Promise<void> {
        return PromiseUtil.runInChain(handles.map(ac => this.toHanldeFunc(ac)), ctx, next);
    }

    protected toHanldeFunc(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            return (ctx: T, next?: Next) => {
                let action = this.resolve(ac, ctx);
                if (action instanceof Handle) {
                    return action.execute(ctx, next);
                } else {
                    return next();
                }
            }
        } else if (ac instanceof Handle) {
            return (ctx: T, next?: Next) => ac.execute(ctx, next);
        }
        return ac;
    }

    
}
