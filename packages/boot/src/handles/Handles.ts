import { lang, AsyncHandler } from '@tsdi/ioc';
import { HandleType, Handle } from './Handle';

/**
 * composite handles.
 *
 * @export
 * @class Handles
 * @extends {BuildHandle<T>}
 * @template T
 */
export abstract class Handles<T> extends Handle<T> {

    protected handles: HandleType<T>[] = [];
    private funcs: AsyncHandler<T>[];


    /**
     * use handle.
     *
     * @param {HandleType} handle
     * @returns {this}
     */
    use(...handles: HandleType<T>[]): this {
        handles.forEach(handle => {
            if (!this.has(handle)) {
                this.handles.push(handle);
            }
        });
        this.registerHandle(...handles);
        this.resetFuncs();
        return this;
    }

    unuse(...handles: HandleType<T>[]) {
        let flag = false;
        handles.forEach(handle => {
            if (lang.del(this.handles, handle)) {
                flag = true;
            }
        });
        if (flag) {
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
     */
    useBefore(handle: HandleType<T>, before: HandleType<T>): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            this.handles.splice(this.handles.indexOf(before), 0, handle);
        } else {
            this.handles.unshift(handle);
        }
        this.registerHandle(handle);
        this.resetFuncs();
        return this;
    }
    /**
     * use handle after.
     *
     * @param {HandleType} handle
     * @param {HandleType} after
     * @returns {this}
     */
    useAfter(handle: HandleType<T>, after?: HandleType<T>): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            this.handles.splice(this.handles.indexOf(after) + 1, 0, handle);
        } else {
            this.handles.push(handle);
        }
        this.registerHandle(handle);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.toHandle(ac)).filter(f => f);
        }
        await this.execFuncs(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }

    protected abstract toHandle(handleType: HandleType<T>): AsyncHandler<T>;

    protected abstract registerHandle(...handleTypes: HandleType<T>[]): this;

}
