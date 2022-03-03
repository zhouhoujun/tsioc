import { chain, isClass, Type } from '@tsdi/ioc';
import { TransportContext } from './context';
import { Middleware, Endpoint } from './middleware';




/**
 * middlewares, compose of {@link Middleware}.
 */
export class Middlewares<T extends TransportContext = TransportContext> implements Endpoint<T> {
    protected handles: Middleware<T>[] = [];
    /**
     * use handle.
     *
     * @param {Middleware<T>} handle
     * @returns {this}
     */
    use(...handles: Middleware<T>[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
        });
        return this;
    }

    unuse(...handles: Middleware<T>[]) {
        handles.forEach(handle => {
            this.remove(this.handles, handle);
        });
        return this;
    }

    /**
     * use handle before
     *
     * @param {Middleware<T>} handle
     * @param {Middleware<T>} before
     * @returns {this}
     */
    useBefore(handle: Middleware<T>, before: Middleware<T>): this {
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
     * @param {Middleware<T>} handle
     * @param {Middleware<T>} after
     * @returns {this}
     */
    useAfter(handle: Middleware<T>, after?: Middleware<T>): this {
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

    protected remove(target: Middleware<T>[], handle: Middleware<T>): void {
        const idx = target.findIndex(h => this.equals(h, handle));
        if (idx >= 0) {
            target.splice(idx, 1);
        }
    }

    has(handle: Middleware<T>): boolean {
        return this.handles.some(h => this.equals(h, handle));
    }

    handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain(this.handles.map(c => isClass(c) ? ctx.resolve(c) : c), ctx, next);
    }

    protected equals(hd: Middleware<T>, hd2: Middleware<T> | Type) {
        if (hd === hd2) return true;
        return;
    }
}



