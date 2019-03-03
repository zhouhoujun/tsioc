import { Type } from '../types';
import { isFunction, isNumber } from '../utils';
import { OnDestroy } from './ComponentLifecycle';
import { IIocContainer } from '../IIocContainer';
import { IocCoreService } from './IocCoreService';

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
     * @param {Type<any>} targetType
     * @returns {boolean}
     * @memberof ICacheManager
     */
    hasCache(targetType: Type<any>): boolean;
    /**
     * cache target.
     *
     * @param {Type<any>} targetType
     * @param {*} target
     * @param {number} expires
     * @memberof ICacheManager
     */
    cache(targetType: Type<any>, target: any, expires: number);
    /**
     * get cache target, if set expires will refresh cache timeout.
     *
     * @param {Type<any>} targetType
     * @param {number} [expires] if set number will reset cache timeout.
     * @returns {*}
     * @memberof ICacheManager
     */
    get(container: IIocContainer, targetType: Type<any>, expires?: number): any;
    /**
     * is check expires or not.
     *
     * @returns {boolean}
     * @memberof ICacheManager
     */
    isChecking(): boolean;
    /**
     * run check expires.
     *
     * @memberof ICacheManager
     */
    checkExpires();
    /**
     * destory cache
     *
     * @param {Type<any>} targetType
     * @param {*} [target]
     * @memberof ICacheManager
     */
    destroy(container: IIocContainer, targetType: Type<any>, target?: any);
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
export class IocCacheManager extends IocCoreService implements IIocCacheManager {

    cacheTokens: Map<Type<any>, CacheTarget>;
    constructor() {
        super()
        this.cacheTokens = new Map();
    }

    isChecking() {
        return !!this.timeout;
    }

    hasCache(targetType: Type<any>) {
        return this.cacheTokens.has(targetType);
    }

    cache(targetType: Type<any>, target: any, expires: number) {
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
        if (!this.isChecking()) {
            this.checkExpires();
        }
    }

    get(container: IIocContainer, targetType: Type<any>, expires?: number) {
        let result = null;
        if (!this.cacheTokens.has(targetType)) {
            return null;
        }
        let cache = this.cacheTokens.get(targetType);
        if (cache.expires <= Date.now()) {
            result = cache.target;
            if (isNumber(expires) && expires > 0) {
                cache.expires = Date.now() + expires;
                this.cacheTokens.set(targetType, cache);
            }
        } else {
            this.destroy(container, targetType, cache.target);
        }

        return result;
    }

    private timeout;
    checkExpires() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = 0;
        }
        if (this.cacheTokens.size > 0) {
            let timeoutCaches = [];
            this.cacheTokens.forEach((cache, targetType) => {
                if (cache.expires >= Date.now()) {
                    timeoutCaches.push(targetType);
                }
            });

            if (timeoutCaches.length) {
                timeoutCaches.forEach(targetType => {
                    this.destroy(targetType, this.cacheTokens.get(targetType).target);
                });
            }

            this.timeout = setTimeout(() => {
                this.checkExpires();
            }, 60000);
        }
    }

    destroy(container: IIocContainer, targetType: Type<any>, target?: any) {

        if (!this.hasCache(targetType)) {
            return;
        }
        if (!target) {
            target = this.cacheTokens.get(targetType).target;
        }

        try {
            let component = target as OnDestroy;
            if (isFunction(component.onDestroy)) {
                container.syncInvoke(target || targetType, 'onDestroy', target);
            }
            this.cacheTokens.delete(targetType);
        } catch (err) {
            console.error && console.error(err);
        }
    }
}
