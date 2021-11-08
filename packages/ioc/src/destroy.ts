/**
 * destory interface.
 */
export interface Destory {

    /**
     * destory this.
     */
    destroy(): void;
}

/**
 * destroyable interface.
 */
export interface Destroyable extends Destory {
    /**
     * destroyed or not.
     */
    destroyed?: boolean;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void;
}
