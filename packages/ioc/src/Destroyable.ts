
/**
 * destroyable interface.
 */
export interface Destroyable {
    /**
     * has destoryed or not.
     */
    readonly destroyed?: boolean;
    /**
     * destory this.
     */
    destroy(): void;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy?(callback: () => void): void;
}
