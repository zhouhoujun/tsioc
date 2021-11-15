import { isFunction, isObject } from './utils/chk';


/**
 * destory interface.
 */
export interface Destroy {
    /**
     * destory this.
     */
    destroy(): void;
}

/**
 * destroy callback type for {@link Destroyable}
 */
export type DestroyCallback = Destroy | (() => void);

/**
 * destroyable interface.
 */
export interface Destroyable extends Destroy {
    /**
     * destroyed or not.
     */
    destroyed?: boolean;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: DestroyCallback): void;
}

/**
 * is destroy or not.
 * @param target 
 * @returns 
 */
export function isDestroy(target: any): target is Destroy {
    return isObject(target) && isFunction((target as Destroy).destroy);
}