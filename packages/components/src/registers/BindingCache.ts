import { Abstract } from '@tsdi/ioc';
import { IBinding } from '../bindings/IBinding';
import { IBindingTypeReflect } from '../bindings/IBindingTypeReflect';

/**
 * binding cache.
 *
 * @export
 * @abstract
 * @class BindingCache
 */
@Abstract()
export abstract class BindingCache {
    abstract getCache(ref: IBindingTypeReflect): Map<string, IBinding>;
}

/**
 * binding cache factory.
 *
 * @export
 * @class BindingCacheFactory
 * @extends {BindingCache}
 */
export class BindingCacheFactory extends BindingCache {

    constructor(private mapGetter: (ref: IBindingTypeReflect) => Map<string, IBinding>) {
        super();
    }

    getCache(ref: IBindingTypeReflect): Map<string, IBinding> {
        return this.mapGetter(ref);
    }
}
