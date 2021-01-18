import { Abstract, IDestroyable } from '@tsdi/ioc';
import { IBootContext } from '../Context';

/**
 * startup db connections of application.
 */
@Abstract()
export abstract class ConnectionStatupService<T extends IBootContext = IBootContext> implements IDestroyable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    
    /**
     *  startup db connection
     *
     * @abstract
     * @param {T} [ctx]
     */
    abstract configureService(ctx: T): Promise<void>;

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
            this.destroyCbs = [];
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
     * default do nothing.
     */
    protected destroying() { }

}
