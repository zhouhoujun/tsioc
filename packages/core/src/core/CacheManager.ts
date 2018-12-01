import { isFunction, isNumber } from '../utils';
import { Type } from '../types';
import { IContainer } from '../IContainer';
import { OnDestroy } from './ComponentLifecycle';
import { ICacheManager } from '../ICacheManager';

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
export class CacheManager implements ICacheManager {
    cacheTokens: Map<Type<any>, CacheTarget>;
    constructor(private container: IContainer) {
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

    get(targetType: Type<any>, expires?: number) {
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
            this.destroy(targetType, cache.target);
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

    destroy(targetType: Type<any>, target?: any) {

        if (!this.hasCache(targetType)) {
            return;
        }
        if (!target) {
            target = this.cacheTokens.get(targetType).target;
        }

        try {
            let component = target as OnDestroy;
            if (isFunction(component.onDestroy)) {
                this.container.syncInvoke(targetType, 'onDestroy', target);
            }
            this.cacheTokens.delete(targetType);
        } catch (err) {
            console.error && console.error(err);
        }
    }
}
