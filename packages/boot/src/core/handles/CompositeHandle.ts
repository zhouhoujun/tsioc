import { Handle, HandleType, IHandleContext } from './Handle';
import { PromiseUtil, isBoolean, isClass, isFunction } from '@tsdi/ioc';
import { HandleRegisterer } from './HandleRegisterer';



/**
 * composite handles.
 *
 * @export
 * @class CompositeHandle
 * @extends {Handle<T>}
 * @template T
 */
export class CompositeHandle<T extends IHandleContext> extends Handle<T> {

    protected handles: HandleType<T>[];
    private funcs: PromiseUtil.ActionHandle<T>[];

    onInit() {
        this.handles = [];
    }

    /**
     * use handle.
     *
     * @param {HandleType} handle
     * @param {boolean} [setup]  setup handle type or not.
     * @returns {this}
     * @memberof LifeScope
     */
    use(handle: HandleType<T>, setup?: boolean): this {
        if (!this.has(handle)) {
            this.handles.push(handle);
            this.registerHandle(handle, setup);
            this.resetFuncs();
        }
        return this;
    }

    has(handle: HandleType<T>): boolean {
        return this.handles.indexOf(handle) >= 0;
    }

    /**
     * use handle before
     *
     * @param {HandleType} handle
     * @param {HandleType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(handle: HandleType<T>, before: HandleType<T> | boolean, setup?: boolean): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            if (isBoolean(before)) {
                this.handles.unshift(handle);
                setup = before;
            } else {
                this.handles.splice(this.handles.indexOf(before) - 1, 0, handle);
            }
        } else {
            this.handles.unshift(handle);
        }
        this.registerHandle(handle, setup);
        this.resetFuncs();
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
    useAfter(handle: HandleType<T>, after?: HandleType<T>, setup?: boolean): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            if (isBoolean(after)) {
                this.handles.push(handle);
                setup = after;
            } else {
                this.handles.splice(this.handles.indexOf(after) + 1, 0, handle);
            }

        } else {
            this.handles.push(handle);
        }
        this.registerHandle(handle, setup);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.parseAction(ac)).filter(f => f);
        }
        await this.execFuncs(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }

    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        this.container.get(HandleRegisterer)
            .register(this.container, HandleType, setup);
        return this;
    }

    protected parseAction(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            let action = this.container.get(HandleRegisterer).get(ac);
            return action instanceof Handle ? action.toAction() : null;

        } else if (ac instanceof Handle) {
            return ac.toAction();
        }
        return isFunction(ac) ? ac : null;
    }

    setup() {

    }
}
