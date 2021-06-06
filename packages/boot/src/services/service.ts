import { Abstract } from '@tsdi/ioc';
import { IService } from '../Context';




/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Service<T = any> implements IService<T> {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];

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
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = null;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.unshift(callback);
        }
    }

    /**
     * destorying. default do nothing.
     */
    protected destroying() { }

}

/**
 * @deprecated use Service instead.
 */
export const Runnable = Service;
