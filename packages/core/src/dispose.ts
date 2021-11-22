
/**
 * Disposable interface.
 */
export interface Disposable {
    /**
     * async dispose.
     */
    dispose(): Promise<void>;
}