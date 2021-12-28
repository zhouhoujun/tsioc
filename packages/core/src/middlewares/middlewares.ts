import { Abstract, AsyncHandler, chain, Type } from '@tsdi/ioc';
import { Context } from './context';
import { Middleware, MiddlewareRef } from './middleware';
import { Route } from './route';


/**
 * message type for register in {@link Middlewares}.
 */
export type MiddlewareType = AsyncHandler<Context> | Middleware | Route;


/**
 * middlewares, compose of {@link Middleware}.
 */
@Abstract()
export abstract class Middlewares<T extends Context = Context> extends Middleware<T> {
    protected handles: MiddlewareType[] = [];
    /**
     * use handle.
     *
     * @param {MiddlewareType} handle
     * @returns {this}
     */
    use(...handles: MiddlewareType[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
        });
        return this;
    }

    unuse(...handles: (MiddlewareType | Type)[]) {
        handles.forEach(handle => {
            this.remove(this.handles, handle);
        });
        return this;
    }

    /**
     * use handle before
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} before
     * @returns {this}
     */
    useBefore(handle: MiddlewareType, before: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, before)), 0, handle);
        } else {
            this.handles.unshift(handle);
        }
        return this;
    }
    /**
     * use handle after.
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} after
     * @returns {this}
     */
    useAfter(handle: MiddlewareType, after?: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, after)) + 1, 0, handle);
        } else {
            this.handles.push(handle);
        }
        return this;
    }

    protected remove(target: MiddlewareType[], handle: MiddlewareType | Type): void {
        const idx = target.findIndex(h => this.equals(h, handle));
        if (idx >= 0) {
            target.splice(idx, 1);
        }
    }

    has(handle: MiddlewareType | Type): boolean {
        return this.handles.some(h => this.equals(h, handle));
    }

    override handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain(this.handles, ctx, next);
    }

    protected equals(hd: MiddlewareType, hd2: MiddlewareType | Type) {
        if (hd === hd2) return true;
        if (hd instanceof MiddlewareRef) {
            return hd2 instanceof MiddlewareRef ? hd.type === hd2.type : hd.type === hd2;
        }
        return false;
    }
}
