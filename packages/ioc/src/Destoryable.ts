import { isFunction } from './utils/chk';


/**
 * destoryable interface.
 */
export interface IDestoryable {
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

/**
 * Destoryable.
 */
export abstract class Destoryable implements IDestoryable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];

    constructor() { }
    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this.destroying();
            this.destroyCbs.forEach(cb => isFunction(cb) && cb());
            this.destroyCbs = [];
        }
    }
    /**
     * destroying.
     */
    protected abstract destroying();
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}
