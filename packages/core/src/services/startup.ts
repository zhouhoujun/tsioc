import { Abstract } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import { IStartupService } from './interface';


/**
 * startup and configure services of application.
 *
 * @export
 * @abstract
 * @class ServiceRegister
 * @template T
 */
@Abstract()
export abstract class StartupService implements IStartupService {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];

    /**
     * config service of application.
     *
     * @abstract
     * @param {ApplicationContext} [ctx]
     */
    abstract configureService(ctx: ApplicationContext): void | Promise<void>;

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
            this._dsryCbs = null!;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs?.unshift(callback);
    }
    /**
     * default do nothing.
     */
    protected destroying() {
        // destory.
    }
}
