
/**
 * destroy hooks.
 */
export interface OnDestroy {
    /**
     * destroy this.
     */
    onDestroy(): any;
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
     * destroy this.
     */
    destroy(): void;
    /**
     * destroyed or not.
     */
    destroyed?: boolean;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback: DestroyCallback): void;
}
