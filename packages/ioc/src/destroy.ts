
/**
 * destroy hooks.
 * 
 * 销毁钩子
 */
export interface OnDestroy {
    /**
     * destroy this.
     */
    onDestroy(): void;
}

/**
 * destroy callback type for {@link Destroyable}
 */
export type DestroyCallback = OnDestroy | (() => void);

/**
 * destroyable interface.
 * 
 * 可销毁对象接口
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
