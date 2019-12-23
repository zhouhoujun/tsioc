import { Abstract } from '@tsdi/ioc';
import { IBinding } from '../bindings/IBinding';
import { IComponentReflect } from '../IComponentReflect';

/**
 * binding cache.
 *
 * @export
 * @abstract
 * @class BindingCache
 */
@Abstract()
export abstract class BindingCache {
    abstract getCache(ref: IComponentReflect): Map<string, IBinding>;
}

/**
 * binding cache factory.
 *
 * @export
 * @class BindingCacheFactory
 * @extends {BindingCache}
 */
export class BindingCacheFactory extends BindingCache {

    constructor(private mapGetter: (ref: IComponentReflect) => Map<string, IBinding>) {
        super();
    }

    getCache(ref: IComponentReflect): Map<string, IBinding> {
        return this.mapGetter(ref);
    }
}
