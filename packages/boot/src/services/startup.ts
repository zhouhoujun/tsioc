import { Abstract } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import { IStartupService } from './intf';


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
    private destroyCbs: (() => void)[] = [];

    /**
     * config service of application.
     *
     * @abstract
     * @param {ApplicationContext} [ctx]
     */
    abstract configureService(ctx: ApplicationContext): Promise<void>;

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
     * default do nothing.
     */
    protected destroying() {
        // destory.
    }

}
