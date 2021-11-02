
/**
 * destroyable interface.
 */
export interface Destroyable {
    destroyed?: boolean;
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
