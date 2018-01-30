import { Type } from './Type';


/**
 * cache manager inteface.
 *
 * @export
 * @interface ICacheManager
 */
export interface ICacheManager {
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
    get(targetType: Type<any>, expires?: number): any;

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
    destroy(targetType: Type<any>, target?: any);
}
