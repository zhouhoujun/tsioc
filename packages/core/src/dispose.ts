import { isFunction, isTypeObject } from '@tsdi/ioc';

/**
 * Disposable interface.
 */
export interface Disposable {
    /**
     * async dispose.
     */
    dispose(): Promise<void>;
}

/**
 * is target instance of {@link Disposable} or not.
 * @param target 
 * @returns 
 */
export function isDisposable(target: any): target is Disposable {
    return isTypeObject(target) && isFunction((target as Disposable).dispose);
}
