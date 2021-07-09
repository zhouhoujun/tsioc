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
export abstract class Service implements IService {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];

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
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs && this._dsryCbs.unshift(callback);
    }

    /**
     * destorying. default do nothing.
     */
    protected destroying() { }

}

