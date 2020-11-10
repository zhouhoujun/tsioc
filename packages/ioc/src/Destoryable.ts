import { isFunction } from './utils/lang';


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

    constructor() { }

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
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
