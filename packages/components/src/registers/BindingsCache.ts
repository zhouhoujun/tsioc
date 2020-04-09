import { isString } from '@tsdi/ioc';
import { IBinding } from '../bindings/IBinding';

/**
 * binding cache.
 *
 * @export
 * @abstract
 * @class BindingCache
 */
export class BindingsCache {
    cache: Map<string, Map<string, any>>;
    constructor() {
        this.cache = new Map();
    }

    register(decor: string | Function) {
        let dkey = isString(decor) ? decor : decor.toString();
        if (!this.cache.has(dkey)) {
            this.cache.set(dkey, new Map());
        }
        return this;
    }

    getCache<T = IBinding>(decor: string): Map<string, T> {
        return this.cache.get(decor);
    }
}
