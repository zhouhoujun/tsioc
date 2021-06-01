import { Abstract } from '@tsdi/ioc';
import { BootContext, IService } from '../Context';




/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Service<T = any> implements IService {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];


    /**
     * configure startup service.
     *
     * @param {BootContext<T>} [ctx]
     * @returns {(Promise<void>)}
     */
    abstract configureService(ctx: BootContext<T>): Promise<void>;

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
            this.destroyCbs.push(callback);
        }
    }

    /**
     * destorying. default do nothing.
     */
    protected destroying() {

    }

}

/**
 * @deprecated use Service instead.
 */
export const Runnable = Service;
