
/**
 * destroyable interface.
 */
export interface Destroyable {
    /**
     * destory this.
     */
    destroy(): void;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void;
}
