import { lang, Type, Abstract, Inject, TARGET } from '@tsdi/ioc';
import { BootContext, IRunnable } from '../Context';



/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable<T = any> implements IRunnable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];


    constructor(@Inject(TARGET) protected instance: T) { }


    getInstance(): T {
        return this.instance ?? this as any;
    }

    getInstanceType(): Type<T> {
        return lang.getClass(this.instance);
    }

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
    protected destroying() { }

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Runnable}
 */
export function isRunnable(target: any): target is Runnable {
    if (target instanceof Runnable) {
        return true;
    }
    return false;
}
