import { lang, Type, Abstract, IDestoryable } from '@tsdi/ioc';
import { IBootContext } from '../Context';


/**
 * IRunnable interface. define the type as a runnable.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default IBootContext
 */
export interface IRunnable extends IDestoryable {

    /**
     * configure and startup this service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     */
    configureService(ctx: IBootContext): Promise<void>;

}


/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable implements IRunnable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];

    /**
     * configure startup service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     */
    abstract configureService(ctx: IBootContext): Promise<void>;

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
     * destorying. default do nothing.
     */
    protected destroying() { }

}

@Abstract()
export abstract class Startup<T = any> extends Runnable {

    protected context: IBootContext;

    async configureService(ctx: IBootContext): Promise<void> {
        this.context = ctx;
        await this.startup();
    }

    abstract startup(): Promise<void>;

    /**
    * runable context.
    *
    * @type {TCtx}
    */
    getContext(): IBootContext {
        return this.context;
    }

    getBoot(): T {
        return this.context.boot;
    }

    getBootType(): Type<T> {
        return lang.getClass(this.context.boot);
    }

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
