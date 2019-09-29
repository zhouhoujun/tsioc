import { Type } from '../types';
import { isFunction, isNumber } from '../utils';
import { IIocContainer } from '../IIocContainer';

/**
 * cache manager inteface.
 *
 * @export
 * @interface ICacheManager
 */
export interface IIocCacheManager {
    /**
     * has cache
     *
     * @param {Type} targetType
     * @returns {boolean}
     * @memberof ICacheManager
     */
    hasCache(targetType: Type): boolean;
    /**
     * cache target.
     *
     * @param {Type} targetType
     * @param {*} target
     * @param {number} expires
     * @memberof ICacheManager
     */
    cache(targetType: Type, target: any, expires: number);
    /**
     * get cache target, if set expires will refresh cache timeout.
     *
     * @param {Type} targetType
     * @param {number} [expires] if set number will reset cache timeout.
     * @returns {*}
     * @memberof ICacheManager
     */
    get(targetType: Type, expires?: number): any;
    /**
     * destory cache
     *
     * @param {Type} targetType
     * @param {*} [target]
     * @memberof ICacheManager
     */
    destroy(targetType: Type, target?: any);
}

/**
 * after component destory.
 *
 * @export
 * @interface OnDestroy
 */
export interface OnDestroy {
    /**
     * component after destory hooks. after property inject.
     *
     * @memberof OnDestroy
     */
    onDestroy();
}


/**
 * cache target.
 *
 * @export
 * @interface CacheTarget
 */
export interface CacheTarget {
    target: any;
    expires: number;
}

/**
 * cache manager.
 *
 * @export
 * @class CacheManager
 * @implements {ICacheManager}
 */
export class IocCacheManager implements IIocCacheManager {

    cacheTokens: WeakMap<Type, CacheTarget>;
    constructor(protected container: IIocContainer) {
        this.cacheTokens = new WeakMap();
    }

    hasCache(targetType: Type) {
        return this.cacheTokens.has(targetType);
    }

    cache(targetType: Type, target: any, expires: number) {
        let cache: CacheTarget;
        if (this.hasCache(targetType)) {
            cache = this.cacheTokens.get(targetType)
            cache.expires = Date.now() + expires;
        } else {
            cache = {
                target: target,
                expires: Date.now() + expires
            }
        }
        this.cacheTokens.set(targetType, cache);
    }

    get(targetType: Type, expires?: number) {
        let result = null;
        let cache = this.cacheTokens.get(targetType);
        if (!cache) {
            return result;
        }
        if (cache.expires <= Date.now()) {
            result = cache.target;
            if (isNumber(expires) && expires > 0) {
                cache.expires = Date.now() + expires;
                this.cacheTokens.set(targetType, cache);
            }
        } else {
            this.destroy(targetType, cache.target);
        }

        return result;
    }

    destroy(targetType: Type, target?: any) {

        if (!this.hasCache(targetType)) {
            return;
        }
        if (!target) {
            target = this.cacheTokens.get(targetType).target;
        }

        try {
            let component = target as OnDestroy;
            if (isFunction(component.onDestroy)) {
                this.container.invoke(target || targetType, 'onDestroy', target);
            }
            this.cacheTokens.delete(targetType);
        } catch (err) {
            console.error && console.error(err);
        }
    }
}
