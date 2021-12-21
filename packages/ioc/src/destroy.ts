
/**
 * destory hooks.
 */
export interface OnDestroy {
    /**
     * destory this.
     */
    onDestroy(): void;
}

/**
 * destroy callback type for {@link Destroyable}
 */
export type DestroyCallback = OnDestroy | (() => void);

/**
 * destroyable interface.
 * extends {@link OnDestroy}
 */
export interface Destroyable {
    /**
     * destory this.
     */
    destroy(): void;
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
